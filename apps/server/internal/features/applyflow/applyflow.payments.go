package applyflow

import (
    "context"
    "errors"
    "fmt"
    "log/slog"
    "math"
    "strings"
    "time"

    "github.com/jackc/pgx/v5"

    "identitycard-server/internal/features/applicants"
    "identitycard-server/internal/features/register"
    "identitycard-server/internal/pkg/applicantsession"
    "identitycard-server/internal/pkg/jobqueue"
    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrNoFee               = errors.New("this form has no application fee")
    ErrPaymentsUnavailable = errors.New("the organizer cannot accept payments yet")
    ErrBadSignature        = errors.New("payment signature is invalid")
    ErrNotPaid             = errors.New("this applicant did not pay an application fee")
)

const currency = "INR"

// draftRow is a draft as the payment code needs it.
type draftRow struct {
    ID        string         `json:"id"`
    FormID    string         `json:"event_form_id"`
    EventID   string         `json:"event_id"`
    Sub       string         `json:"google_sub"`
    Email     string         `json:"email"`
    Name      string         `json:"name"`
    Picture   string         `json:"picture_url"`
    Answers   map[string]any `json:"answers"`
    SubEvents []string       `json:"sub_event_ids"`
    Status    string         `json:"status"`
    Amount    int64          `json:"amount"`
    OrderID   *string        `json:"razorpay_order_id"`
    PaymentID *string        `json:"razorpay_payment_id"`
    Applicant *string        `json:"applicant_id"`
}

const draftRowSelect = `SELECT to_jsonb(d) FROM application_drafts d `

func (s *App) formFee(ctx context.Context, formID string) (int64, error) {
    var fee int64
    err := s.DB.QueryRow(ctx, `SELECT fee FROM event_forms WHERE id::text = $1`, formID).Scan(&fee)
    return fee, postgres.MapPgError(err)
}

func (r *draftRow) toDraft() *Draft {
    return &Draft{ID: r.ID, Answers: r.Answers, SubEventIDs: r.SubEvents}
}

func (r *draftRow) session() *applicantsession.Session {
    return &applicantsession.Session{FormID: r.FormID, Sub: r.Sub, Email: r.Email, Name: r.Name, Picture: r.Picture}
}

// PayService validates the application, holds a seat for
// APPLICATION_SEAT_HOLD and returns a Razorpay order (reused on retry).
func (s *App) PayService(ctx context.Context, sess *applicantsession.Session) (*Checkout, error) {
    state, err := s.StateService(ctx, sess)
    if err != nil {
        return nil, err
    }
    if state.Registration != nil {
        return nil, ErrRegistered
    }
    if state.Draft == nil {
        return nil, ErrDraftLocked
    }
    if state.Fee <= 0 {
        return nil, ErrNoFee
    }
    d, err := postgres.QueryJSON[draftRow](ctx, s.DB, draftRowSelect+`WHERE id = $1::uuid`, state.Draft.ID)
    if err != nil {
        return nil, err
    }
    account, err := s.Payouts.ActiveAccountID(ctx, d.EventID)
    if err != nil {
        return nil, err
    }
    if account == "" || !s.Razorpay.Configured() {
        return nil, ErrPaymentsUnavailable
    }

    // Check the answers before taking money.
    req := buildRequest(sess, d.toDraft())
    if err := applicants.Validate(applicants.CreateApplicantRequest{Name: req.Name, Email: req.Email, Phone: req.Phone, Data: req.Data}); err != nil {
        return nil, err
    }
    if err := s.Uploads.CheckRequired(ctx, sess.FormID, req.Data); err != nil {
        return nil, err
    }

    holdUntil := time.Now().Add(s.Cfg.ApplicationSeatHold)
    err = postgres.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
        if err := postgres.LockKey(ctx, tx, postgres.EventApplicantsLockKey(d.EventID)); err != nil {
            return err
        }
        var used, capacity int
        var closed bool
        err := tx.QueryRow(ctx, `
            SELECT
                (SELECT count(*) FROM event_applicants WHERE event_id = ef.event_id)
                + (SELECT count(*) FROM application_drafts
                   WHERE event_id = ef.event_id AND status = 'awaiting_payment' AND hold_until > now() AND id <> $2::uuid),
                LEAST(ce.applicant_limit, CASE WHEN ef.max_applicants = -1 THEN ce.applicant_limit ELSE ef.max_applicants END),
                ef.expires_at <= now() OR ce.is_expired OR ce.is_suspended OR NOT ef.is_locked
            FROM event_forms ef
            JOIN events e ON e.id = ef.event_id
            JOIN credit_entitlements ce ON ce.credit_id = e.credit_id
            WHERE ef.id::text = $1
        `, sess.FormID, d.ID).Scan(&used, &capacity, &closed)
        if err != nil {
            return postgres.MapPgError(err)
        }
        if closed {
            return register.ErrFormExpired
        }
        if used >= capacity {
            return register.ErrFormLimitReached
        }
        return postgres.Exec(ctx, tx, `
            UPDATE application_drafts
            SET status = 'awaiting_payment', hold_until = $2, amount = $3, current_step = GREATEST(current_step, 2), updated_at = now()
            WHERE id = $1::uuid AND status IN ('draft', 'awaiting_payment')
        `, d.ID, holdUntil, state.Fee)
    })
    if err != nil {
        return nil, err
    }

    orderID := ""
    if d.OrderID != nil && d.Amount == state.Fee {
        orderID = *d.OrderID
    } else {
        o, err := s.Razorpay.CreateOrder(ctx, state.Fee, currency, "app_"+strings.ReplaceAll(d.ID, "-", "")[:20],
            map[string]string{"kind": "application", "draft_id": d.ID})
        if err != nil {
            return nil, err
        }
        orderID = o.ID
        if err := postgres.Exec(ctx, s.DB, `UPDATE application_drafts SET razorpay_order_id = $2 WHERE id = $1::uuid`, d.ID, orderID); err != nil {
            return nil, err
        }
    }
    return &Checkout{OrderID: orderID, KeyID: s.Razorpay.KeyID(), Amount: state.Fee, Currency: currency,
        Name: sess.Name, Email: sess.Email, HoldUntil: holdUntil}, nil
}

// BackService returns a draft awaiting payment to editing and frees its seat.
func (s *App) BackService(ctx context.Context, sess *applicantsession.Session) (*State, error) {
    if err := postgres.Exec(ctx, s.DB, `
        UPDATE application_drafts SET status = 'draft', hold_until = NULL, current_step = 1, updated_at = now()
        WHERE event_form_id::text = $1 AND google_sub = $2 AND status = 'awaiting_payment'
    `, sess.FormID, sess.Sub); err != nil {
        return nil, err
    }
    return s.StateService(ctx, sess)
}

// VerifyService handles the checkout's success callback.
func (s *App) VerifyService(ctx context.Context, sess *applicantsession.Session, req VerifyRequest) (*State, error) {
    if !s.Razorpay.VerifyCheckout(req.OrderID, req.PaymentID, req.Signature) {
        return nil, ErrBadSignature
    }
    if err := s.Finalize(ctx, req.OrderID, req.PaymentID); err != nil {
        return nil, err
    }
    return s.StateService(ctx, sess)
}

// reconcile asks Razorpay whether an open order was paid (reload after
// paying, before the webhook) and finalizes it.
func (s *App) reconcile(ctx context.Context, orderID string) {
    payments, err := s.Razorpay.OrderPayments(ctx, orderID)
    if err != nil {
        slog.Warn("applyflow: order status", "order", orderID, "error", err)
        return
    }
    for _, p := range payments {
        if p.Status == "captured" {
            if err := s.Finalize(ctx, orderID, p.ID); err != nil {
                slog.Warn("applyflow: finalize on reload", "order", orderID, "error", err)
            }
            return
        }
    }
}

// HandleOrderPaid is called by the Razorpay webhook for orders that are not
// credit purchases. It reports whether the order was an application.
func (s *App) HandleOrderPaid(ctx context.Context, orderID, paymentID string) (bool, error) {
    var exists bool
    if err := s.DB.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM application_drafts WHERE razorpay_order_id = $1)`, orderID).Scan(&exists); err != nil {
        return false, postgres.MapPgError(err)
    }
    if !exists {
        return false, nil
    }
    return true, s.Finalize(ctx, orderID, paymentID)
}

// Finalize turns a paid draft into an applicant, exactly once (checkout
// callback, webhook and reload can race). If the applicant can no longer be
// registered (event full, window closed), the payment is refunded.
func (s *App) Finalize(ctx context.Context, orderID, paymentID string) error {
    conn, err := s.DB.Acquire(ctx)
    if err != nil {
        return err
    }
    defer conn.Release()
    lockKey := "draft_finalize:" + orderID
    if _, err := conn.Exec(ctx, `SELECT pg_advisory_lock(hashtextextended($1, 0))`, lockKey); err != nil {
        return err
    }
    defer conn.Exec(context.WithoutCancel(ctx), `SELECT pg_advisory_unlock(hashtextextended($1, 0))`, lockKey) //nolint:errcheck

    d, err := postgres.QueryJSON[draftRow](ctx, s.DB, draftRowSelect+`WHERE razorpay_order_id = $1`, orderID)
    if err != nil {
        return err
    }
    if d.Status == "confirmed" || d.Status == "refunded" {
        return nil
    }
    payment, err := s.Razorpay.Payment(ctx, paymentID)
    if err != nil {
        return err
    }
    if payment.OrderID != orderID || payment.Status != "captured" {
        return fmt.Errorf("payment %s is %s", paymentID, payment.Status)
    }

    sess := d.session()
    res, err := s.Register.SubmitApplicationService(ctx, d.FormID, buildRequest(sess, d.toDraft()))
    if err != nil {
        reason := err.Error()
        slog.Warn("applyflow: paid application cannot register; refunding", "draft", d.ID, "reason", reason)
        refundID, rerr := s.Razorpay.Refund(ctx, paymentID, false, map[string]string{"draft_id": d.ID, "reason": reason})
        if rerr != nil {
            return fmt.Errorf("refund after failed registration: %w", rerr)
        }
        _ = postgres.Exec(ctx, s.DB, `
            UPDATE application_drafts
            SET status = 'refunded', razorpay_payment_id = $2, paid_at = now(), refund_id = $3, refunded_at = now(),
                refund_reason = $4, hold_until = NULL, updated_at = now()
            WHERE id = $1::uuid`, d.ID, paymentID, refundID, "could not register: "+reason)
        s.enqueue(ctx, JobRefunded, d.ID)
        return nil
    }

    platformFee := int64(math.Round(float64(payment.Amount) * s.Cfg.PlatformFeePercent / 100))
    if err := postgres.Exec(ctx, s.DB, `
        UPDATE application_drafts
        SET status = 'confirmed', applicant_id = $2, confirmed_at = now(), razorpay_payment_id = $3, paid_at = now(),
            gateway_fee = $4, platform_fee = $5, hold_until = NULL, updated_at = now()
        WHERE id = $1::uuid`, d.ID, res.UserID, paymentID, payment.Fee, platformFee); err != nil {
        return err
    }
    s.transfer(ctx, d, payment.Amount, payment.Fee, platformFee, paymentID)
    if platformFee > 0 {
        _ = postgres.Exec(ctx, s.DB, `
            INSERT INTO transactions (kind, source, amount, currency, description, draft_id, organization_id)
            SELECT 'income', 'application_fee', $2, $3, 'Application fee share: ' || $4, $1::uuid, e.organization_id
            FROM events e WHERE e.id = $5::uuid
            ON CONFLICT DO NOTHING`, d.ID, platformFee, currency, d.Email, d.EventID)
    }
    s.enqueue(ctx, JobConfirmed, d.ID)
    return nil
}

// transfer sends the organizer's share (fee minus Razorpay's fee and the
// platform fee) to their linked account. A failure is logged; the money
// stays on the platform account until retried.
func (s *App) transfer(ctx context.Context, d *draftRow, amount, gatewayFee, platformFee int64, paymentID string) {
    share := amount - gatewayFee - platformFee
    if share <= 0 {
        return
    }
    account, err := s.Payouts.ActiveAccountID(ctx, d.EventID)
    if err != nil || account == "" {
        slog.Error("applyflow: no payout account for transfer", "draft", d.ID, "error", err)
        return
    }
    id, err := s.Razorpay.Transfer(ctx, paymentID, account, share, currency, map[string]string{"draft_id": d.ID})
    if err != nil {
        slog.Error("applyflow: transfer to organizer failed", "draft", d.ID, "error", err)
        return
    }
    _ = postgres.Exec(ctx, s.DB, `UPDATE application_drafts SET transfer_id = $2 WHERE id = $1::uuid`, d.ID, id)
}

// RefundService (organizer): refunds a paid applicant in full, pulls back
// the transfer, removes the applicant and emails them.
func (s *App) RefundService(ctx context.Context, eventID, applicantID string, req RefundRequest) error {
    d, err := postgres.QueryJSON[draftRow](ctx, s.DB, draftRowSelect+`WHERE event_id = $1::uuid AND applicant_id = $2 AND status = 'confirmed'`, eventID, applicantID)
    if errors.Is(err, postgres.ErrNotFound) || (err == nil && (d.PaymentID == nil || d.Amount == 0)) {
        return ErrNotPaid
    }
    if err != nil {
        return err
    }
    reason := strings.TrimSpace(req.Reason)
    refundID, err := s.Razorpay.Refund(ctx, *d.PaymentID, true, map[string]string{"draft_id": d.ID, "reason": reason})
    if err != nil {
        return err
    }
    if err := postgres.Exec(ctx, s.DB, `
        UPDATE application_drafts SET status = 'refunded', refund_id = $2, refunded_at = now(), refund_reason = $3, updated_at = now()
        WHERE id = $1::uuid`, d.ID, refundID, reason); err != nil {
        return err
    }
    _ = postgres.Exec(ctx, s.DB, `
        INSERT INTO transactions (kind, source, amount, currency, description, draft_id, organization_id)
        SELECT 'refund', 'application_fee', t.amount, t.currency, 'Application fee share refunded: ' || $2, $1::uuid, t.organization_id
        FROM transactions t WHERE t.draft_id = $1::uuid AND t.kind = 'income'
        ON CONFLICT DO NOTHING`, d.ID, d.Email)
    if err := s.Applicants.RemoveApplicant(ctx, eventID, applicantID); err != nil {
        slog.Error("applyflow: remove refunded applicant", "draft", d.ID, "error", err)
    }
    s.enqueue(ctx, JobRefunded, d.ID)
    return nil
}

func (s *App) enqueue(ctx context.Context, jobType, draftID string) {
    if s.Queue == nil {
        return
    }
    if err := s.Queue.Enqueue(ctx, jobqueue.Job{Type: jobType, ID: draftID}); err != nil {
        slog.Warn("applyflow: enqueue email", "type", jobType, "draft", draftID, "error", err)
    }
}
