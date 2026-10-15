package router

import (
    "context"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/config"
    "identitycard-server/internal/features/admin/catalog"
    "identitycard-server/internal/features/admin/clients"
    "identitycard-server/internal/features/admin/dashboard"
    "identitycard-server/internal/features/admin/ledger"
    "identitycard-server/internal/features/admin/session"
    "identitycard-server/internal/features/admin/subscriptions"
    "identitycard-server/internal/features/pricing"
    "identitycard-server/internal/generic"
    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/jwtauth"
)

// AdminRouter wires the platform-admin API (cmd/admin). Admin features live
// under internal/features/admin.
type AdminRouter struct {
    App     *fiber.App
    CFG     *config.Config
    DB      *pgxpool.Pool
    Redis   *redis.Client
    RootCtx context.Context

    Session       *session.App
    Dashboard     *dashboard.App
    Clients       *clients.App
    Catalog       *catalog.App
    Ledger        *ledger.App
    Subscriptions *subscriptions.App
}

func NewAdminRouter(
    app *fiber.App,
    cfg *config.Config,
    pool *pgxpool.Pool,
    rdb *redis.Client,
    rootCtx context.Context,
) *AdminRouter {
    cch := cache.New(rdb)
    pricingApp := pricing.NewApp(pool, cch)
    // Client sessions are only revoked from here (suspension), never issued.
    clientSessions := jwtauth.New(jwtauth.ClientConfig(cfg), rdb, nil)

    return &AdminRouter{
        App:     app,
        CFG:     cfg,
        DB:      pool,
        Redis:   rdb,
        RootCtx: rootCtx,

        Session:       session.NewApp(cfg, rdb),
        Dashboard:     dashboard.NewApp(pool),
        Clients:       clients.NewApp(pool, cch, pricingApp, clientSessions),
        Catalog:       catalog.NewApp(pool, pricingApp),
        Ledger:        ledger.NewApp(pool),
        Subscriptions: subscriptions.NewApp(pool),
    }
}

func (r *AdminRouter) SetUp() {
    useCommonMiddlewares(r.App, r.CFG, r.Redis, r.RootCtx, r.CFG.AdminWebURL, "Content-Type,Authorization")

    api := r.App.Group(generic.APIV1Prefix)

    // 1. Public: login and logout.
    r.Session.RegisterPublicRoutes(api)

    // 2. Everything else needs the admin session.
    admin := api.Group("", r.Session.RequireAdmin)
    r.Session.RegisterRoutes(admin)
    r.Dashboard.RegisterRoutes(admin)
    r.Clients.RegisterRoutes(admin)
    r.Catalog.RegisterRoutes(admin)
    r.Ledger.RegisterRoutes(admin)
    r.Subscriptions.RegisterRoutes(admin)
}
