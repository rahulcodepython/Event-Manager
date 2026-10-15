package devices

import (
    "time"

    "github.com/go-webauthn/webauthn/webauthn"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"
)

type App struct {
    DB              *pgxpool.Pool
    Redis           *redis.Client
    WebAuthn        *webauthn.WebAuthn
    RPID            string
    CanonicalOrigin string
    PINTTL          time.Duration // DEVICE_PIN_TTL
}

func NewApp(db *pgxpool.Pool, rdb *redis.Client, wa *webauthn.WebAuthn, rpID, canonicalOrigin string, pinTTL time.Duration) *App {
    return &App{
        DB:              db,
        Redis:           rdb,
        WebAuthn:        wa,
        RPID:            rpID,
        CanonicalOrigin: canonicalOrigin,
        PINTTL:          pinTTL,
    }
}
