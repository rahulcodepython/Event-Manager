package applyflow

import "time"

type Applicant struct {
    Email   string `json:"email"`
    Name    string `json:"name"`
    Picture string `json:"picture"`
}

// Registration is shown instead of the form once the applicant is registered.
type Registration struct {
    UserID     string    `json:"user_id"`
    Status     string    `json:"status"` // registered | refunded
    CardStatus string    `json:"card_status"`
    CreatedAt  time.Time `json:"created_at"`
    SubEvents  []string  `json:"sub_events"`
    // RefundReason is set when Status is refunded.
    RefundReason string `json:"refund_reason,omitempty"`
}

type Draft struct {
    ID           string         `json:"id"`
    Answers      map[string]any `json:"answers"`
    SubEventIDs  []string       `json:"sub_event_ids"`
    CurrentStep  int            `json:"current_step"`
    Status       string         `json:"status"`
    UpdatedAt    time.Time      `json:"updated_at"`
    HoldUntil    *time.Time     `json:"hold_until"`
    OrderID      *string        `json:"order_id,omitempty"`
}

// State is everything the public form needs after a reload.
type State struct {
    SignedIn     bool          `json:"signed_in"`
    Applicant    *Applicant    `json:"applicant"`
    Draft        *Draft        `json:"draft"`
    Registration *Registration `json:"registration"`
    // Fee is the form's application fee in paise (0 = free).
    Fee      int64  `json:"fee"`
    Currency string `json:"currency"`
}

// Checkout is what the Razorpay popup needs to take the fee.
type Checkout struct {
    OrderID   string    `json:"order_id"`
    KeyID     string    `json:"key_id"`
    Amount    int64     `json:"amount"`
    Currency  string    `json:"currency"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    HoldUntil time.Time `json:"hold_until"`
}

type VerifyRequest struct {
    OrderID   string `json:"razorpay_order_id"`
    PaymentID string `json:"razorpay_payment_id"`
    Signature string `json:"razorpay_signature"`
}

type RefundRequest struct {
    Reason string `json:"reason"`
}

type SignInRequest struct {
    Credential string `json:"credential"`
}

type IntentResponse struct {
    Nonce    string `json:"nonce"`
    ClientID string `json:"client_id"`
    // LoginURI is where Google posts in redirect mode.
    LoginURI string `json:"login_uri"`
}

type SaveRequest struct {
    Answers     map[string]any `json:"answers"`
    SubEventIDs []string       `json:"sub_event_ids"`
    CurrentStep int            `json:"current_step"`
}

type EnrollRequest struct {
    SubEventID string `json:"sub_event_id"`
}

// OrganizerDraft is an application in progress, as the organizer sees it.
type OrganizerDraft struct {
    ID          string     `json:"id"`
    Email       string     `json:"email"`
    Name        string     `json:"name"`
    Status      string     `json:"status"`
    CurrentStep int        `json:"current_step"`
    Amount      int64      `json:"amount"`
    HoldUntil   *time.Time `json:"hold_until"`
    RefundedAt  *time.Time `json:"refunded_at"`
    Reason      string     `json:"refund_reason"`
    UpdatedAt   time.Time  `json:"updated_at"`
}
