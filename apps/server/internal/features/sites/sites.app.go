// Package sites lets an organizer claim a subdomain for an event and upload
// a static site (zip) for it. Files live in object storage under
// sites/<event id>/<version>/; cmd/sites serves them (see sitehost).
package sites

import (
    "context"
    "log/slog"

    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/config"
    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/storage"
)

type App struct {
    DB    *pgxpool.Pool
    Cache *cache.Cache
    Store *storage.Store
    Cfg   *config.Config
}

func NewApp(db *pgxpool.Pool, cch *cache.Cache, store *storage.Store, cfg *config.Config) *App {
    return &App{DB: db, Cache: cch, Store: store, Cfg: cfg}
}

// OnEventDeleted removes the event's site files; the database row goes
// with the event (and frees the slug).
func (s *App) OnEventDeleted(ctx context.Context, eventID string) {
    if err := s.Store.DeletePrefix(context.WithoutCancel(ctx), eventPrefix(eventID)); err != nil {
        slog.Warn("sites: delete files of deleted event", "event", eventID, "error", err)
    }
    s.invalidateAll(ctx)
}
