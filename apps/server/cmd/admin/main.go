package main

import (
    "context"
    "log"
    "log/slog"
    "os"

    "identitycard-server/internal/config"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/pkg/redis"
    "identitycard-server/internal/router"
)

func main() {
    slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("[admin] config load failed: %v", err)
    }
    if err := cfg.RequireAdmin(); err != nil {
        log.Fatalf("[admin] %v", err)
    }

    pool, err := postgres.Connect(context.Background(), cfg)
    if err != nil {
        log.Fatalf("[admin] database connect failed: %v", err)
    }
    defer postgres.Close(pool)

    rdb := redis.Connect(context.Background(), cfg)
    defer rdb.Close()

    // Root context for the server lifecycle; cancelled on shutdown.
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    app := router.NewFiberApp(cfg, "IdentityCard Admin API")
    router.NewAdminRouter(app, cfg, pool, rdb, ctx).SetUp()

    if err := router.Listen(app, cfg.AdminPort, cancel); err != nil {
        log.Fatalf("[admin] listen: %v", err)
    }
}
