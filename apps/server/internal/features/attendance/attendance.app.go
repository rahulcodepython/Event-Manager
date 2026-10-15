package attendance

import (
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/qrsign"
)

// App is the composition root for the attendance feature.
type App struct {
    DB     *pgxpool.Pool
    Cache  *cache.Cache
    Signer *qrsign.Signer
}

// NewApp creates a new App instance for attendance.
func NewApp(db *pgxpool.Pool, cache *cache.Cache, signer *qrsign.Signer) *App {
    return &App{
        DB:     db,
        Cache:  cache,
        Signer: signer,
    }
}
