package pricing

import (
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/pkg/cache"
)

type App struct {
    DB    *pgxpool.Pool
    Cache *cache.Cache
}

func NewApp(db *pgxpool.Pool, cache *cache.Cache) *App {
    return &App{DB: db, Cache: cache}
}
