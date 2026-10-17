package applyflow

import (
    "context"
    "encoding/json"
    "errors"
    "log/slog"
    "strings"
    "time"

    "github.com/jackc/pgx/v5"

    "identitycard-server/internal/features/register"
    "identitycard-server/internal/features/subevents"
    "identitycard-server/internal/pkg/applicantsession"
    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrFormNotFound   = errors.New("registration form not found")
    ErrBadNonce       = errors.New("the sign-in expired or did not start here; try again")
    ErrRegistered     = errors.New("you are already registered for this event")
    ErrRefunded       = errors.New("your registration was refunded")
    ErrDraftLocked    = errors.New("this application can no longer be edited")
    ErrDraftTooLarge  = errors.New("the application is too large")
    ErrNotRegistered  = errors.New("register for the event first")
    ErrPaymentPending = errors.New("pay the application fee to submit")
)

const maxDraftBytes = 64 * 1024

// systemKeys come from Google, never from the form answers.
var systemKeys = map[string]bool{"name": true, "email": true}

func (s *App) eventOf(ctx context.Context, formID string) (string, error) {
    var eventID string
    err := s.DB.QueryRow(ctx, formQuery, formID).Scan(&eventID)
    if errors.Is(postgres.MapPgError(err), postgres.ErrNotFound) {
        return "", ErrFormNotFound
    }
    return eventID, postgres.MapPgError(err)
}

// IntentService starts a sign-in: a nonce the page passes to Google.
func (s *App) IntentService(ctx context.Context, setNonce func(formID string) (string, error), formID string) (*IntentResponse, error) {
    if _, err := s.eventOf(ctx, formID); err != nil {
        return nil, err
    }
    nonce, err := setNonce(formID)
    if err != nil {
        return nil, err
    }
    return &IntentResponse{Nonce: nonce, ClientID: s.Cfg.GoogleClientID, LoginURI: s.Cfg.ApplicantGoogleLoginURI}, nil
}

// SignInService verifies the Google ID token against the pending intent and
// returns the session to set. It creates the applicant's draft unless they
// are already registered.
func (s *App) SignInService(ctx context.Context, intentForm, intentNonce, formID, credential string) (*applicantsession.Session, error) {
    if intentForm == "" || intentForm != formID {
        return nil, ErrBadNonce
    }
    id, err := s.Google.Verify(ctx, credential)
    if err != nil {
        return nil, err
    }
    if id.Nonce != intentNonce {
        return nil, ErrBadNonce
    }
    eventID, err := s.eventOf(ctx, formID)
    if err != nil {
        return nil, err
    }

    sess := &applicantsession.Session{
        FormID: formID, Sub: id.Sub, Email: strings.ToLower(id.Email),
        Name: strings.TrimSpace(id.Name), Picture: id.Picture,
    }
    if sess.Name == "" {
        sess.Name = strings.Split(sess.Email, "@")[0]
    }
    if reg, _ := s.registration(ctx, formID, sess.Email); reg == nil {
        if err := postgres.Exec(ctx, s.DB, upsertDraftQuery, formID, eventID, sess.Sub, sess.Email, sess.Name, sess.Picture); err != nil {
            return nil, err
        }
    }
    return sess, nil
}

func (s *App) registration(ctx context.Context, formID, email string) (*Registration, error) {
    r, err := postgres.QueryJSON[Registration](ctx, s.DB, registrationQuery, formID, email)
    if errors.Is(err, postgres.ErrNotFound) {
        return nil, nil
    }
    return r, err
}

// StateService returns the applicant, their draft and any registration.
func (s *App) StateService(ctx context.Context, sess *applicantsession.Session) (*State, error) {
    fee, err := s.formFee(ctx, sess.FormID)
    if err != nil {
        return nil, err
    }
    state := &State{
        SignedIn:  true,
        Applicant: &Applicant{Email: sess.Email, Name: sess.Name, Picture: sess.Picture},
        Fee:       fee,
        Currency:  currency,
    }
    reg, err := s.registration(ctx, sess.FormID, sess.Email)
    if err != nil {
        return nil, err
    }
    if reg != nil {
        state.Registration = reg
        return state, nil
    }
    var reason string
    err = s.DB.QueryRow(ctx, refundedQuery, sess.FormID, sess.Sub).Scan(&reason)
    if err == nil {
        state.Registration = &Registration{Status: "refunded", RefundReason: reason}
        return state, nil
    }
    if !errors.Is(err, pgx.ErrNoRows) {
        return nil, postgres.MapPgError(err)
    }
    d, err := postgres.QueryJSON[Draft](ctx, s.DB, draftQuery, sess.FormID, sess.Sub)
    if err != nil && !errors.Is(err, postgres.ErrNotFound) {
        return nil, err
    }
    // Paid but the page never heard back: ask Razorpay, then re-read.
    if d != nil && d.Status == "awaiting_payment" && d.OrderID != nil && !reconciling(ctx) {
        s.reconcile(withReconciling(ctx), *d.OrderID)
        return s.StateService(withReconciling(ctx), sess)
    }
    state.Draft = d
    return state, nil
}

// SaveService auto-saves the draft's answers and step.
func (s *App) SaveService(ctx context.Context, sess *applicantsession.Session, req SaveRequest) (*State, error) {
    if req.Answers == nil {
        req.Answers = map[string]any{}
    }
    for k := range systemKeys {
        delete(req.Answers, k)
    }
    raw, err := json.Marshal(req.Answers)
    if err != nil {
        return nil, err
    }
    if len(raw) > maxDraftBytes {
        return nil, ErrDraftTooLarge
    }
    if req.CurrentStep < 0 {
        req.CurrentStep = 0
    }
    if req.SubEventIDs == nil {
        req.SubEventIDs = []string{}
    }
    tag, err := s.DB.Exec(ctx, saveDraftQuery, sess.FormID, sess.Sub, string(raw), req.SubEventIDs, req.CurrentStep)
    if err != nil {
        return nil, postgres.MapPgError(err)
    }
    if tag.RowsAffected() == 0 {
        // Recreated if the sweep removed it; refused once confirmed.
        state, err := s.StateService(ctx, sess)
        if err != nil {
            return nil, err
        }
        if state.Registration != nil {
            return nil, ErrDraftLocked
        }
        eventID, err := s.eventOf(ctx, sess.FormID)
        if err != nil {
            return nil, err
        }
        if err := postgres.Exec(ctx, s.DB, upsertDraftQuery, sess.FormID, eventID, sess.Sub, sess.Email, sess.Name, sess.Picture); err != nil {
            return nil, err
        }
        if _, err := s.DB.Exec(ctx, saveDraftQuery, sess.FormID, sess.Sub, string(raw), req.SubEventIDs, req.CurrentStep); err != nil {
            return nil, postgres.MapPgError(err)
        }
    }
    return s.StateService(ctx, sess)
}

// SubmitService confirms a free application: the draft becomes an
// applicant (name and email from Google, photo from Google when the form
// has no Photo field).
func (s *App) SubmitService(ctx context.Context, sess *applicantsession.Session) (*State, error) {
    state, err := s.StateService(ctx, sess)
    if err != nil {
        return nil, err
    }
    if state.Registration != nil {
        if state.Registration.Status == "refunded" {
            return nil, ErrRefunded
        }
        return state, nil
    }
    if state.Draft == nil {
        return nil, ErrDraftLocked
    }
    fee, err := s.formFee(ctx, sess.FormID)
    if err != nil {
        return nil, err
    }
    if fee > 0 {
        return nil, ErrPaymentPending
    }

    req := buildRequest(sess, state.Draft)
    res, err := s.Register.SubmitApplicationService(ctx, sess.FormID, req)
    if err != nil {
        return nil, err
    }
    if err := postgres.Exec(ctx, s.DB, confirmDraftQuery, sess.FormID, sess.Sub, res.UserID); err != nil {
        slog.Error("applyflow: mark draft confirmed", "form", sess.FormID, "error", err)
    }
    s.enqueue(ctx, JobConfirmed, state.Draft.ID)
    return s.StateService(ctx, sess)
}

// buildRequest turns a draft into the registration request.
func buildRequest(sess *applicantsession.Session, d *Draft) register.SubmitApplicationRequest {
    data := map[string]any{}
    var phone, link string
    for k, v := range d.Answers {
        switch k {
        case "phone":
            phone, _ = v.(string)
        case "_sub_event_link":
            link, _ = v.(string)
        default:
            if !systemKeys[k] {
                data[k] = v
            }
        }
    }
    return register.SubmitApplicationRequest{
        Name: sess.Name, Email: sess.Email, Phone: phone, Data: data,
        SubEventIDs: d.SubEventIDs, SubEventLink: link, GooglePicture: sess.Picture,
    }
}

// EnrollService adds a registered applicant to a sub-event through its
// public link.
func (s *App) EnrollService(ctx context.Context, sess *applicantsession.Session, req EnrollRequest) (*State, error) {
    reg, err := s.registration(ctx, sess.FormID, sess.Email)
    if err != nil {
        return nil, err
    }
    if reg == nil {
        return nil, ErrNotRegistered
    }
    cfg, err := s.Register.GetPublicApplyConfigService(ctx, sess.FormID)
    if err != nil {
        return nil, err
    }
    if cfg.IsExpired || time.Now().After(cfg.ExpiresAt) {
        return nil, register.ErrFormExpired
    }
    open := false
    for _, o := range cfg.SubEvents.Options {
        open = open || (o.ID == req.SubEventID && o.LinkEnabled)
    }
    if !open {
        return nil, register.ErrSubEventLinkClosed
    }
    err = postgres.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
        return subevents.EnrollTx(ctx, tx, cfg.Event.ID, reg.UserID, []string{req.SubEventID}, &subevents.SelfRules{
            Mode: cfg.SubEvents.Mode, Required: false, Fixed: true,
        })
    })
    if err != nil {
        return nil, err
    }
    return s.StateService(ctx, sess)
}

// StartSweeper deletes stale drafts every APPLICATION_DRAFT_SWEEP_EVERY.
func (s *App) StartSweeper(ctx context.Context) {
    go func() {
        ticker := time.NewTicker(s.Cfg.ApplicationDraftSweep)
        defer ticker.Stop()
        for {
            if tag, err := s.DB.Exec(ctx, sweepQuery, int64(s.Cfg.ApplicationDraftTTL.Seconds())); err != nil {
                slog.Warn("applyflow: sweep drafts", "error", err)
            } else if n := tag.RowsAffected(); n > 0 {
                slog.Info("applyflow: swept drafts", "count", n)
            }
            select {
            case <-ctx.Done():
                return
            case <-ticker.C:
            }
        }
    }()
}

type reconcilingKey struct{}

// withReconciling marks a context so StateService reconciles at most once.
func withReconciling(ctx context.Context) context.Context {
    return context.WithValue(ctx, reconcilingKey{}, true)
}

func reconciling(ctx context.Context) bool {
    v, _ := ctx.Value(reconcilingKey{}).(bool)
    return v
}
