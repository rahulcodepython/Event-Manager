package clients

import (
    "time"

    "identitycard-server/internal/features/pricing"
)

type Owner struct {
    ID        string `json:"id"`
    Email     string `json:"email"`
    Name      string `json:"name"`
    AvatarURL string `json:"avatar_url"`
}

type ClientSummary struct {
    ID          string     `json:"id"`
    Name        string     `json:"name"`
    Phone       string     `json:"phone"`
    Owner       Owner      `json:"owner"`
    TrialChoice *string    `json:"trial_choice"`
    SuspendedAt *time.Time `json:"suspended_at"`
    CreatedAt   time.Time  `json:"created_at"`
    Credits     int        `json:"credits"`
    Events      int        `json:"events"`
    // Revenue: payments minus refunds, in paise.
    Revenue int64 `json:"revenue"`
}

type ClientList struct {
    Data  []ClientSummary `json:"data"`
    Total int             `json:"total"`
    Page  int             `json:"page"`
    Limit int             `json:"limit"`
}

type CreditFeature struct {
    Key   string `json:"key"`
    Name  string `json:"name"`
    Value int    `json:"value"`
    Label string `json:"label"`
}

type Ref struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

type Credit struct {
    ID        string          `json:"id"`
    Name      string          `json:"name"`
    Kind      string          `json:"kind"`
    Status    string          `json:"status"`
    Currency  string          `json:"currency"`
    Total     int64           `json:"total"`
    StartsAt  time.Time       `json:"starts_at"`
    EndsAt    time.Time       `json:"ends_at"`
    RevokedAt *time.Time      `json:"revoked_at"`
    CreatedAt time.Time       `json:"created_at"`
    Event     *Ref            `json:"event"`
    Features  []CreditFeature `json:"features"`
}

type Event struct {
    ID         string    `json:"id"`
    Name       string    `json:"name"`
    StartDate  string    `json:"start_date"`
    EndDate    string    `json:"end_date"`
    Applicants int       `json:"applicants"`
    Credit     Ref       `json:"credit"`
    CreatedAt  time.Time `json:"created_at"`
}

type Payment struct {
    ID                string     `json:"id"`
    CreditName        string     `json:"credit_name"`
    CreditID          *string    `json:"credit_id"`
    Amount            int64      `json:"amount"`
    Currency          string     `json:"currency"`
    Status            string     `json:"status"`
    RazorpayOrderID   string     `json:"razorpay_order_id"`
    RazorpayPaymentID *string    `json:"razorpay_payment_id"`
    PaidAt            *time.Time `json:"paid_at"`
    RefundedAt        *time.Time `json:"refunded_at"`
    RefundNote        string     `json:"refund_note"`
    CreatedAt         time.Time  `json:"created_at"`
}

type ClientDetail struct {
    ClientSummary
    CreditList  []Credit  `json:"credit_list"`
    EventList   []Event   `json:"event_list"`
    PaymentList []Payment `json:"payment_list"`
}

type GrantCreditRequest struct {
    Name       string              `json:"name"`
    Selections []pricing.Selection `json:"selections"`
}

type RefundRequest struct {
    Note string `json:"note"`
}
