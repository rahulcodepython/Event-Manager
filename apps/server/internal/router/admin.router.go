package router

import (
    "context"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/config"
)

// AdminRouter wires the platform-admin API (cmd/admin). Admin features live
// under internal/features like client features and register their routes
// on the /api/v1 group in SetUp.
type AdminRouter struct {
    App     *fiber.App
    CFG     *config.Config
    DB      *pgxpool.Pool
    Redis   *redis.Client
    RootCtx context.Context
}

func NewAdminRouter(
    app *fiber.App,
    cfg *config.Config,
    pool *pgxpool.Pool,
    rdb *redis.Client,
    rootCtx context.Context,
) *AdminRouter {
    return &AdminRouter{
        App:     app,
        CFG:     cfg,
        DB:      pool,
        Redis:   rdb,
        RootCtx: rootCtx,
    }
}

func (r *AdminRouter) SetUp() {
    useCommonMiddlewares(r.App, r.CFG, r.Redis, r.RootCtx, r.CFG.AdminWebURL, "Content-Type,Authorization")
}
