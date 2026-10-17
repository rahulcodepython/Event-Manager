package attendance

import (
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/qrsign"
    "identitycard-server/internal/pkg/storage"
)

// App is the composition root for the attendance feature.
type App struct {
    DB     *pgxpool.Pool
    Cache  *cache.Cache
    Signer *qrsign.Signer
    Store  *storage.Store
}

// NewApp creates a new App instance for attendance.
func NewApp(db *pgxpool.Pool, cache *cache.Cache, signer *qrsign.Signer, store *storage.Store) *App {
    return &App{
        DB:     db,
        Cache:  cache,
        Signer: signer,
        Store:  store,
    }
}
