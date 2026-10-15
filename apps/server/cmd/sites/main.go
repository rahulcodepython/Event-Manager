package main

import (
    "context"
    "log"
    "log/slog"
    "os"

    "identitycard-server/internal/config"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/pkg/redis"
    "identitycard-server/internal/pkg/storage"
    "identitycard-server/internal/router"
)

// The event-site server: serves uploaded static sites at <slug>.<SITES_DOMAIN>.
func main() {
    slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("[sites] config load failed: %v", err)
    }

    pool, err := postgres.Connect(context.Background(), cfg)
    if err != nil {
        log.Fatalf("[sites] database connect failed: %v", err)
    }
    defer postgres.Close(pool)

    rdb := redis.Connect(context.Background(), cfg)
    defer rdb.Close()

    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    store := storage.Connect(ctx, cfg)
    app := router.NewFiberApp(cfg, "IdentityCard Sites", router.DefaultBodyLimit)
    router.NewSitesRouter(app, cfg, pool, rdb, store, ctx).SetUp()

    if err := router.Listen(app, cfg.SitesPort, cancel); err != nil {
        log.Fatalf("[sites] listen: %v", err)
    }
}
