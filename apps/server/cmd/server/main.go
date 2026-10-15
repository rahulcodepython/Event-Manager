package main

import (
    "context"
    "log"
    "log/slog"
    "os"

    "github.com/go-webauthn/webauthn/webauthn"

    "identitycard-server/internal/config"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/pkg/redis"
    "identitycard-server/internal/router"
)

func main() {
    slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("[server] config load failed: %v", err)
    }

    pool, err := postgres.Connect(context.Background(), cfg)
    if err != nil {
        log.Fatalf("[server] database connect failed: %v", err)
    }
    defer postgres.Close(pool)

    rdb := redis.Connect(context.Background(), cfg)
    defer rdb.Close()

    wa, err := webauthn.New(&webauthn.Config{
        RPDisplayName: cfg.RPDisplayName,
        RPID:          cfg.RPID,
        RPOrigins:     []string{cfg.CanonicalOrigin},
    })
    if err != nil {
        log.Fatalf("[server] webauthn init failed: %v", err)
    }

    // Root context for the server lifecycle; cancelled on shutdown.
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    app := router.NewFiberApp(cfg, "IdentityCard API")
    router.NewAppRouter(app, cfg, pool, rdb, wa, ctx).SetUp()

    if err := router.Listen(app, cfg.Port, cancel); err != nil {
        log.Fatalf("[server] listen: %v", err)
    }
}
