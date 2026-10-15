// Package ledger is the admin's income and expense book: client payments
// and refunds (written automatically), manual entries and subscription
// renewals, plus the admin-managed categories.
package ledger

import "github.com/jackc/pgx/v5/pgxpool"

type App struct {
    DB *pgxpool.Pool
}

func NewApp(db *pgxpool.Pool) *App {
    return &App{DB: db}
}
