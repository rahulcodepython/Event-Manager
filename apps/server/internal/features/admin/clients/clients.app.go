// Package clients is the admin's view of client organizations: list and
// detail (credits, events, payments) plus suspend, trial reset, granted
// credits and payment refunds.
package clients

import (
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/features/pricing"
    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/jwtauth"
)

type App struct {
    DB      *pgxpool.Pool
    Cache   *cache.Cache
    Pricing *pricing.App
    // ClientSessions revokes a suspended client's sessions.
    ClientSessions *jwtauth.Manager
}

func NewApp(db *pgxpool.Pool, cch *cache.Cache, pricingApp *pricing.App, clientSessions *jwtauth.Manager) *App {
    return &App{DB: db, Cache: cch, Pricing: pricingApp, ClientSessions: clientSessions}
}
