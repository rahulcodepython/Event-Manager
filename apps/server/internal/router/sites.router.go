package router

import (
    "context"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/compress"
    "github.com/gofiber/fiber/v2/middleware/recover"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/config"
    "identitycard-server/internal/features/sitehost"
    "identitycard-server/internal/generic"
    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/storage"
    "identitycard-server/internal/utils"
)

// SitesRouter wires the event-site server (cmd/sites). No CORS and no
// helmet defaults: these are third-party sites, not the app.
type SitesRouter struct {
    App     *fiber.App
    CFG     *config.Config
    Redis   *redis.Client
    RootCtx context.Context
    Host    *sitehost.App
}

func NewSitesRouter(app *fiber.App, cfg *config.Config, pool *pgxpool.Pool, rdb *redis.Client, store *storage.Store, rootCtx context.Context) *SitesRouter {
    return &SitesRouter{
        App:     app,
        CFG:     cfg,
        Redis:   rdb,
        RootCtx: rootCtx,
        Host:    sitehost.NewApp(pool, cache.New(rdb), store, cfg),
    }
}

func (r *SitesRouter) SetUp() {
    r.App.Use(middlewares.RequestContextMiddleware(r.RootCtx, time.Duration(r.CFG.RequestTimeoutSec)*time.Second))
    r.App.Use(middlewares.LoggerMiddleware())
    r.App.Use(recover.New())
    r.App.Use(compress.New())
    r.App.Use(middlewares.RateLimiterMiddleware(r.Redis, r.CFG.RateLimitPerMinute, r.CFG.RateLimitBurst))

    r.App.Get(generic.RouteHealth, func(c *fiber.Ctx) error {
        return utils.OK(c, generic.MsgStatusOk, fiber.Map{"status": generic.MsgStatusOk})
    })
    r.App.Get("/__tls-check", r.Host.TLSCheck)
    r.App.Use(r.Host.Serve)
}
