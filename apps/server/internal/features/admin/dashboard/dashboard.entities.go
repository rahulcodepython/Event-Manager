package dashboard

import "time"

// Money is in paise. Revenue = income - refunds; Profit = revenue - expenses.
type Money struct {
    Income   int64 `json:"income"`
    Refunds  int64 `json:"refunds"`
    Expenses int64 `json:"expenses"`
    Revenue  int64 `json:"revenue"`
    Profit   int64 `json:"profit"`
}

type Month struct {
    Month string `json:"month"` // YYYY-MM
    Money
}

type Counts struct {
    Clients          int `json:"clients"`
    SuspendedClients int `json:"suspended_clients"`
    NewClients       int `json:"new_clients"` // this month
    CreditsSold      int `json:"credits_sold"`
    CreditsGranted   int `json:"credits_granted"`
    TrialsClaimed    int `json:"trials_claimed"`
    ActiveEvents     int `json:"active_events"`
}

type DueSubscription struct {
    ID        string `json:"id"`
    Name      string `json:"name"`
    Amount    int64  `json:"amount"`
    NextDueOn string `json:"next_due_on"`
    Overdue   bool   `json:"overdue"`
}

type RecentPayment struct {
    ID           string    `json:"id"`
    Organization Ref       `json:"organization"`
    CreditName   string    `json:"credit_name"`
    Amount       int64     `json:"amount"`
    Status       string    `json:"status"`
    PaidAt       time.Time `json:"paid_at"`
}

type Ref struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

type Dashboard struct {
    Currency         string            `json:"currency"`
    AllTime          Money             `json:"all_time"`
    ThisMonth        Money             `json:"this_month"`
    Counts           Counts            `json:"counts"`
    Monthly          []Month           `json:"monthly"`
    DueSubscriptions []DueSubscription `json:"due_subscriptions"`
    RecentPayments   []RecentPayment   `json:"recent_payments"`
}
