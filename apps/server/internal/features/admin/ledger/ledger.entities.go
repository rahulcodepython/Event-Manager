package ledger

import "time"

type Category struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    Kind      string    `json:"kind"`
    InUse     int       `json:"in_use"`
    CreatedAt time.Time `json:"created_at"`
}

type CategoryRequest struct {
    Name string `json:"name"`
    Kind string `json:"kind"`
}

type Ref struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

// Transaction kinds: income, expense, refund. Sources: payment (automatic),
// manual, subscription (a confirmed renewal).
type Transaction struct {
    ID           string    `json:"id"`
    Kind         string    `json:"kind"`
    Source       string    `json:"source"`
    Amount       int64     `json:"amount"`
    Currency     string    `json:"currency"`
    Description  string    `json:"description"`
    OccurredOn   string    `json:"occurred_on"`
    Category     *Ref      `json:"category"`
    Organization *Ref      `json:"organization"`
    Subscription *Ref      `json:"subscription"`
    PaymentID    *string   `json:"payment_id"`
    CreatedAt    time.Time `json:"created_at"`
}

type Totals struct {
    Income  int64 `json:"income"`
    Expense int64 `json:"expense"`
    Refund  int64 `json:"refund"`
    // Net = income - refunds - expenses.
    Net int64 `json:"net"`
}

type TransactionList struct {
    Data   []Transaction `json:"data"`
    Total  int           `json:"total"`
    Page   int           `json:"page"`
    Limit  int           `json:"limit"`
    Totals Totals        `json:"totals"`
}

type ListFilter struct {
    Kind       string
    Source     string
    CategoryID string
    From       string // YYYY-MM-DD, inclusive
    To         string // YYYY-MM-DD, inclusive
    Search     string
    Page       int
    Limit      int
}

// TransactionRequest creates or edits a manual entry. Amount is in paise.
type TransactionRequest struct {
    Kind        string  `json:"kind"`
    Amount      int64   `json:"amount"`
    Description string  `json:"description"`
    OccurredOn  string  `json:"occurred_on"`
    CategoryID  *string `json:"category_id"`
}
