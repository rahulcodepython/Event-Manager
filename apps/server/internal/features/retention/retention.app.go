// Package retention deletes events whose data retention has run out:
// credit end date + the credit's backup days.
package retention

import (
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/features/events/events"
)

type App struct {
    DB     *pgxpool.Pool
    Redis  *redis.Client
    Events *events.App
}

func NewApp(db *pgxpool.Pool, rdb *redis.Client, eventsApp *events.App) *App {
    return &App{DB: db, Redis: rdb, Events: eventsApp}
}
