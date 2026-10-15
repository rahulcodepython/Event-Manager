package credits

import (
    "time"

    "identitycard-server/internal/features/pricing"
)

type CreditFeature struct {
    Key    string `json:"key"`
    Name   string `json:"name"`
    Unit   string `json:"unit"`
    Value  int    `json:"value"`
    Label  string `json:"label"`
    Amount int64  `json:"amount"`
}

type CreditEvent struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

// Credit status: active (usable now), expired (past ends_at) or revoked
// (ended early by the admin, e.g. refunded).
type Credit struct {
    ID        string          `json:"id"`
    Name      string          `json:"name"`
    Kind      string          `json:"kind"`
    Status    string          `json:"status"`
    Currency  string          `json:"currency"`
    Subtotal  int64           `json:"subtotal"`
    Tax       int64           `json:"tax"`
    Total     int64           `json:"total"`
    Discount  int64           `json:"discount"`
    StartsAt  time.Time       `json:"starts_at"`
    EndsAt    time.Time       `json:"ends_at"`
    // PruneAt: when an event on this credit is deleted (ends_at + backup days).
    PruneAt   time.Time       `json:"prune_at"`
    CreatedAt time.Time       `json:"created_at"`
    RevokedAt *time.Time      `json:"revoked_at"`
    Event     *CreditEvent    `json:"event"`
    Features  []CreditFeature `json:"features"`
}

type RenameCreditRequest struct {
    Name string `json:"name"`
}

type CreateOrderRequest struct {
    Name       string              `json:"name"`
    Selections []pricing.Selection `json:"selections"`
    CouponCode string              `json:"coupon_code"`
}

// CreateOrderResponse is what the Razorpay Checkout popup needs. When a
// coupon makes the total 0, Free is set, the credit already exists and
// there is no Razorpay order.
type CreateOrderResponse struct {
    Free     bool           `json:"free"`
    CreditID string         `json:"credit_id,omitempty"`
    OrderID  string         `json:"order_id"`
    KeyID    string         `json:"key_id"`
    Amount   int64          `json:"amount"`
    Currency string         `json:"currency"`
    Quote    *pricing.Quote `json:"quote"`
}

type VerifyPaymentRequest struct {
    OrderID   string `json:"razorpay_order_id"`
    PaymentID string `json:"razorpay_payment_id"`
    Signature string `json:"razorpay_signature"`
}

type VerifyPaymentResponse struct {
    CreditID string `json:"credit_id"`
}

// razorpayWebhook is the subset of a Razorpay webhook body we read.
type razorpayWebhook struct {
    Event   string `json:"event"`
    Payload struct {
        Payment struct {
            Entity struct {
                ID      string `json:"id"`
                OrderID string `json:"order_id"`
            } `json:"entity"`
        } `json:"payment"`
    } `json:"payload"`
}

// receipt is a free purchase's receipt email.
type receipt struct {
    PaymentID    string         `json:"payment_id"`
    Email        string         `json:"email"`
    OwnerName    string         `json:"owner_name"`
    Organization string         `json:"organization"`
    CreditName   string         `json:"credit_name"`
    CouponCode   string         `json:"coupon_code"`
    Discount     int64          `json:"discount"`
    Amount       int64          `json:"amount"`
    Currency     string         `json:"currency"`
    Quote        pricing.Quote  `json:"quote"`
    PaidAt       time.Time      `json:"paid_at"`
}
