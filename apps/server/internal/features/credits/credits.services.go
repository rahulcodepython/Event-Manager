package credits

import (
    "context"
    "errors"
    "strings"

    "github.com/google/uuid"

    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrPaymentsNotConfigured = errors.New("payments are not configured")
    ErrInvalidCreditName     = errors.New("credit name is required")
    ErrTrialAlreadyDecided   = errors.New("free trial is no longer available")
    ErrInvalidSignature      = errors.New("payment signature is invalid")
    ErrOrderNotFound         = errors.New("order not found")
)

func (s *App) ListCreditsService(ctx context.Context, orgID string) ([]Credit, error) {
    return s.ListCreditsRepository(ctx, orgID)
}

func (s *App) RenameCreditService(ctx context.Context, creditID string, req RenameCreditRequest) (*Credit, error) {
    name := strings.TrimSpace(req.Name)
    if name == "" {
        return nil, ErrInvalidCreditName
    }
    return s.RenameCreditRepository(ctx, creditID, name)
}

// ClaimTrialService creates the one-time trial credit.
func (s *App) ClaimTrialService(ctx context.Context, orgID string) (string, error) {
    id, err := s.ClaimTrialRepository(ctx, orgID)
    if errors.Is(err, postgres.ErrNotFound) {
        return "", ErrTrialAlreadyDecided
    }
    return id, err
}

func (s *App) SkipTrialService(ctx context.Context, orgID string) error {
    return s.SkipTrialRepository(ctx, orgID)
}

// CreateOrderService prices the selections on the server and opens a
// Razorpay order for exactly that amount.
func (s *App) CreateOrderService(ctx context.Context, orgID string, req CreateOrderRequest) (*CreateOrderResponse, error) {
    if s.Cfg.RazorpayKeyID == "" || s.Cfg.RazorpayKeySecret == "" {
        return nil, ErrPaymentsNotConfigured
    }
    name := strings.TrimSpace(req.Name)
    if name == "" {
        return nil, ErrInvalidCreditName
    }

    quote, err := s.Pricing.QuoteService(ctx, req.Selections)
    if err != nil {
        return nil, err
    }

    orderID, err := s.createRazorpayOrder(ctx, quote.Total, quote.Currency, uuid.NewString()[:32])
    if err != nil {
        return nil, err
    }
    if err := s.InsertPaymentRepository(ctx, orgID, name, quote, orderID); err != nil {
        return nil, err
    }

    return &CreateOrderResponse{
        OrderID:  orderID,
        KeyID:    s.Cfg.RazorpayKeyID,
        Amount:   quote.Total,
        Currency: quote.Currency,
        Quote:    quote,
    }, nil
}

// VerifyPaymentService checks the checkout signature and creates the credit.
func (s *App) VerifyPaymentService(ctx context.Context, orgID string, req VerifyPaymentRequest) (string, error) {
    if s.Cfg.RazorpayKeySecret == "" {
        return "", ErrPaymentsNotConfigured
    }
    if !validSignature([]byte(req.OrderID+"|"+req.PaymentID), req.Signature, s.Cfg.RazorpayKeySecret) {
        return "", ErrInvalidSignature
    }

    // Make sure the order belongs to this organization before fulfilling.
    if _, err := s.GetPaymentCreditRepository(ctx, req.OrderID, orgID); err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            return "", ErrOrderNotFound
        }
        return "", err
    }
    return s.fulfill(ctx, req.OrderID, req.PaymentID, orgID)
}

// WebhookService confirms payments whose browser flow never reached verify.
func (s *App) WebhookService(ctx context.Context, body []byte, signature string, event razorpayWebhook) error {
    if s.Cfg.RazorpayWebhookSecret == "" {
        return ErrPaymentsNotConfigured
    }
    if !validSignature(body, signature, s.Cfg.RazorpayWebhookSecret) {
        return ErrInvalidSignature
    }
    if event.Event != "payment.captured" && event.Event != "order.paid" {
        return nil
    }

    entity := event.Payload.Payment.Entity
    if entity.OrderID == "" {
        return nil
    }
    _, err := s.fulfill(ctx, entity.OrderID, entity.ID, "")
    if errors.Is(err, ErrOrderNotFound) {
        return nil // not one of our orders
    }
    return err
}

// fulfill marks the order paid and creates its credit. Safe to call twice
// (checkout verify and webhook): the second call returns the same credit.
func (s *App) fulfill(ctx context.Context, orderID, paymentID, orgID string) (string, error) {
    creditID, err := s.FulfillPaymentRepository(ctx, orderID, paymentID, uuid.NewString())
    if err == nil {
        return creditID, nil
    }
    if !errors.Is(err, postgres.ErrNotFound) {
        return "", err
    }

    // Already paid: return the existing credit.
    if orgID == "" {
        var existing string
        err := s.DB.QueryRow(ctx, `SELECT COALESCE(credit_id::text, '') FROM payments WHERE razorpay_order_id = $1`, orderID).Scan(&existing)
        if err != nil {
            return "", ErrOrderNotFound
        }
        return existing, nil
    }
    existing, err := s.GetPaymentCreditRepository(ctx, orderID, orgID)
    if err != nil || existing == "" {
        return "", ErrOrderNotFound
    }
    return existing, nil
}
