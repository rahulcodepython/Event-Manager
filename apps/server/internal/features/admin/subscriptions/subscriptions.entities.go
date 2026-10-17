package subscriptions

import "time"

type Ref struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

// Subscription status: inactive, overdue (due date passed), due (within
// 7 days) or upcoming.
type Subscription struct {
    ID             string    `json:"id"`
    Name           string    `json:"name"`
    Vendor         string    `json:"vendor"`
    Amount         int64     `json:"amount"`
    Currency       string    `json:"currency"`
    IntervalMonths int       `json:"interval_months"`
    NextDueOn      string    `json:"next_due_on"`
    Status         string    `json:"status"`
    Category       *Ref      `json:"category"`
    IsActive       bool      `json:"is_active"`
    Notes          string    `json:"notes"`
    LastRenewedOn  *string   `json:"last_renewed_on"`
    TotalSpent     int64     `json:"total_spent"`
    CreatedAt      time.Time `json:"created_at"`
}

type SubscriptionRequest struct {
    Name           string  `json:"name"`
    Vendor         string  `json:"vendor"`
    Amount         int64   `json:"amount"`
    IntervalMonths int     `json:"interval_months"`
    NextDueOn      string  `json:"next_due_on"`
    CategoryID     *string `json:"category_id"`
    IsActive       bool    `json:"is_active"`
    Notes          string  `json:"notes"`
}

// RenewRequest confirms one renewal. Amount defaults to the subscription's
// amount and PaidOn to today.
type RenewRequest struct {
    Amount *int64 `json:"amount"`
    PaidOn string `json:"paid_on"`
}
