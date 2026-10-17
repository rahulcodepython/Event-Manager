package applicants

import (
    "context"

    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/pkg/cache"
)

type App struct {
    DB    *pgxpool.Pool
    Cache *cache.Cache
    // OnDelete hooks clean up after an applicant is deleted, given the
    // applicant's form data (e.g. uploaded images).
    OnDelete []func(ctx context.Context, eventID string, data map[string]any)
}

func NewApp(db *pgxpool.Pool, cache *cache.Cache) *App {
    return &App{
        DB:    db,
        Cache: cache,
    }
}
