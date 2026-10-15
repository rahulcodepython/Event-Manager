// Package uploads handles image fields (photo, signature) on the public
// form. An image is uploaded first and stored under uploads/pending/; the
// upload returns a signed token, and the form submission exchanges the
// token for the image, copied to applicants/<event id>/. Pending images
// that are never submitted are swept after a day.
package uploads

import (
    "crypto/sha256"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/pkg/storage"
)

const (
    pendingPrefix   = "uploads/pending/"
    applicantPrefix = "applicants/"
)

type App struct {
    DB    *pgxpool.Pool
    Redis *redis.Client
    Store *storage.Store
    key   []byte

    maxPerHour int           // uploads per IP per hour (UPLOAD_MAX_PER_HOUR)
    pendingTTL time.Duration // unclaimed uploads are deleted after this
}

// NewApp derives the token key from the app secret so it differs from the
// QR signing key.
func NewApp(db *pgxpool.Pool, rdb *redis.Client, store *storage.Store, secret string, maxPerHour int, pendingTTL time.Duration) *App {
    k := sha256.Sum256([]byte("uploads:" + secret))
    return &App{DB: db, Redis: rdb, Store: store, key: k[:], maxPerHour: maxPerHour, pendingTTL: pendingTTL}
}

// EventPrefix holds every image of an event's applicants.
func EventPrefix(eventID string) string {
    return applicantPrefix + eventID + "/"
}
