// Package subevents manages sub-events: smaller events inside an event with
// their own days (stored in event_dates, see events/dates), an optional
// hard cap, and enrollments of the event's applicants. Applicants join by
// organizer assignment, by choosing on the public form, or through a
// sub-event link (the event form with that sub-event fixed).
package subevents

import (
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/pkg/cache"
)

type App struct {
    DB    *pgxpool.Pool
    Cache *cache.Cache
}

func NewApp(db *pgxpool.Pool, cch *cache.Cache) *App {
    return &App{DB: db, Cache: cch}
}
