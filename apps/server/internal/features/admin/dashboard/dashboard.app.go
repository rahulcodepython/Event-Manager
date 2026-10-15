// Package dashboard serves the admin overview: revenue, income vs expense,
// client and credit counts, active events and renewals coming due.
package dashboard

import "github.com/jackc/pgx/v5/pgxpool"

type App struct {
    DB *pgxpool.Pool
}

func NewApp(db *pgxpool.Pool) *App {
    return &App{DB: db}
}
