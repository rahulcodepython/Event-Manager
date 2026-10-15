// Package subscriptions tracks the business's own recurring costs. The
// admin confirms each renewal, which records an expense and moves the next
// due date forward.
package subscriptions

import "github.com/jackc/pgx/v5/pgxpool"

type App struct {
    DB *pgxpool.Pool
}

func NewApp(db *pgxpool.Pool) *App {
    return &App{DB: db}
}
