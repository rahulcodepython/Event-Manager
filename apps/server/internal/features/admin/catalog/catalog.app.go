// Package catalog lets the admin edit pricing: the settings row and each
// existing feature's text, defaults, options and rates. Feature keys,
// value types and the feature set itself are fixed because code reads them.
package catalog

import (
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/features/pricing"
)

type App struct {
    DB      *pgxpool.Pool
    Pricing *pricing.App
}

func NewApp(db *pgxpool.Pool, pricingApp *pricing.App) *App {
    return &App{DB: db, Pricing: pricingApp}
}
