// Package cards publishes applicants' ID cards: the closing / publishing
// schedule of an event, queueing card emails, resends, and the card PDF and
// signed QR for the organizer.
package cards

import (
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/jobqueue"
    "identitycard-server/internal/pkg/mailer"
    "identitycard-server/internal/pkg/qrsign"
    "identitycard-server/internal/pkg/storage"
)

// JobType is the email queue job that sends one card (id = event_applicants.id).
const JobType = "card"

type App struct {
    DB     *pgxpool.Pool
    Redis  *redis.Client
    Cache  *cache.Cache
    Queue  *jobqueue.Queue
    Mailer *mailer.Mailer
    Signer *qrsign.Signer
    // Store holds applicant photos and signatures printed on the card.
    Store *storage.Store
}

func NewApp(db *pgxpool.Pool, rdb *redis.Client, cch *cache.Cache, queue *jobqueue.Queue, m *mailer.Mailer, signer *qrsign.Signer, store *storage.Store) *App {
    return &App{DB: db, Redis: rdb, Cache: cch, Queue: queue, Mailer: m, Signer: signer, Store: store}
}
