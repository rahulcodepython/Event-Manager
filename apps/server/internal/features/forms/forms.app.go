package forms

import (
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/pkg/cache"
)

// App is the composition root for the forms feature.
type App struct {
    DB    *pgxpool.Pool
    Cache *cache.Cache
}

// NewApp wires together repository, service, and handler for forms.
func NewApp(db *pgxpool.Pool, cache *cache.Cache) *App {
    return &App{
        DB:    db,
        Cache: cache,
    }
}
