package clients

import (
    "context"
    "errors"
    "strings"

    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrInvalidCreditName = errors.New("credit name is required")
    ErrNotRefundable     = errors.New("only paid payments can be refunded")
)

func (s *App) ListService(ctx context.Context, search, status string, page, limit int) (*ClientList, error) {
    if status != "active" && status != "suspended" {
        status = ""
    }
    res, err := s.ListRepository(ctx, strings.TrimSpace(search), status, page, limit)
    if err != nil {
        return nil, err
    }
    res.Page, res.Limit = page, limit
    return res, nil
}

func (s *App) GetService(ctx context.Context, orgID string) (*ClientDetail, error) {
    return s.GetRepository(ctx, orgID)
}

// SetSuspendedService suspends or restores a client. Suspending also ends
// every session of the owner; their access token stops working on the next
// request because RequireAuth checks the suspension.
func (s *App) SetSuspendedService(ctx context.Context, orgID string, suspended bool) (*ClientDetail, error) {
    ownerID, err := s.SetSuspendedRepository(ctx, orgID, suspended)
    if err != nil {
        return nil, err
    }
    if suspended {
        if err := s.ClientSessions.RevokeAll(ctx, ownerID); err != nil {
            return nil, err
        }
    }
    s.invalidateClientCaches(ctx)
    return s.GetRepository(ctx, orgID)
}

// ResetTrialService lets the client choose the free trial again.
func (s *App) ResetTrialService(ctx context.Context, orgID string) (*ClientDetail, error) {
    if err := s.ResetTrialRepository(ctx, orgID); err != nil {
        return nil, err
    }
    return s.GetRepository(ctx, orgID)
}

// GrantCreditService gives the client a free credit priced from the same
// catalog as a purchase, valid from now for the chosen duration.
func (s *App) GrantCreditService(ctx context.Context, orgID string, req GrantCreditRequest) (*ClientDetail, error) {
    name := strings.TrimSpace(req.Name)
    if name == "" {
        return nil, ErrInvalidCreditName
    }
    quote, err := s.Pricing.QuoteService(ctx, req.Selections)
    if err != nil {
        return nil, err
    }
    if _, err := s.GrantCreditRepository(ctx, orgID, name, quote); err != nil {
        return nil, err
    }
    return s.GetRepository(ctx, orgID)
}

// RefundService records a refund made in the Razorpay dashboard and ends
// the payment's credit now.
func (s *App) RefundService(ctx context.Context, paymentID string, req RefundRequest) (*ClientDetail, error) {
    orgID, err := s.RefundPaymentRepository(ctx, paymentID, strings.TrimSpace(req.Note))
    if errors.Is(err, postgres.ErrNotFound) {
        if _, statusErr := s.PaymentStatusRepository(ctx, paymentID); statusErr == nil {
            return nil, ErrNotRefundable
        }
        return nil, err
    }
    if err != nil {
        return nil, err
    }
    s.invalidateClientCaches(ctx)
    return s.GetRepository(ctx, orgID)
}

// invalidateClientCaches drops the client API's cached event and public
// form data, which embed credit expiry and suspension.
func (s *App) invalidateClientCaches(ctx context.Context) {
    if s.Cache == nil {
        return
    }
    for _, pattern := range []string{"cache:events:*", "cache:public_apply:*", "cache:event_forms:*"} {
        _ = s.Cache.DeletePattern(ctx, pattern)
    }
}
