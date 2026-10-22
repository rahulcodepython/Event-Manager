package events

import (
    "context"

    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/pkg/cache"
)

// App is the composition root for the events feature.
type App struct {
    DB    *pgxpool.Pool
    Cache *cache.Cache
    // OnDelete hooks clean up data outside Postgres (e.g. site files) after
    // an event is deleted, by the organizer or by retention.
    OnDelete []func(ctx context.Context, eventID string)
    // DefaultTimezone is given to events created without one (APP_TIMEZONE).
    DefaultTimezone string
}

// NewApp wires together repository, service, and handler for events.
func NewApp(db *pgxpool.Pool, cache *cache.Cache) *App {
    return &App{
        DB:    db,
        Cache: cache,
    }
}
