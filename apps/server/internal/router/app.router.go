package router

import (
    "context"

    "github.com/go-webauthn/webauthn/webauthn"
    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/config"
    "identitycard-server/internal/features/applicants"
    "identitycard-server/internal/features/attendance"
    "identitycard-server/internal/features/devices"
    "identitycard-server/internal/features/events/dates"
    "identitycard-server/internal/features/events/events"
    "identitycard-server/internal/features/forms"
    "identitycard-server/internal/features/register"
    "identitycard-server/internal/generic"
    "identitycard-server/internal/pkg/cache"
)

// AppRouter wires the client-facing API (cmd/server).
type AppRouter struct {
    App     *fiber.App
    CFG     *config.Config
    RootCtx context.Context

    Events     *events.App
    Dates      *dates.App
    Forms      *forms.App
    Register   *register.App
    Applicants *applicants.App
    Devices    *devices.App
    Attendance *attendance.App
}

func NewAppRouter(
    app *fiber.App,
    cfg *config.Config,
    pool *pgxpool.Pool,
    rdb *redis.Client,
    wa *webauthn.WebAuthn,
    rootCtx context.Context,
) *AppRouter {
    cch := cache.New(rdb)

    registerApp := register.NewApp(pool, rdb, cch)
    registerApp.StartWorker(rootCtx)

    return &AppRouter{
        App:     app,
        CFG:     cfg,
        RootCtx: rootCtx,

        Events:     events.NewApp(pool, cch),
        Dates:      dates.NewApp(pool, cch),
        Forms:      forms.NewApp(pool, cch),
        Register:   registerApp,
        Applicants: applicants.NewApp(pool, cch),
        Devices:    devices.NewApp(pool, rdb, wa, cfg.RPID, cfg.CanonicalOrigin),
        Attendance: attendance.NewApp(pool, cch),
    }
}

func (r *AppRouter) SetUp() {
    useCommonMiddlewares(r.App, r.CFG, r.RootCtx, r.CFG.WebOrigin, "Content-Type,Authorization,X-Device-Token")

    api := r.App.Group(generic.APIV1Prefix)

    r.Events.RegisterRoutes(api)
    r.Dates.RegisterRoutes(api)
    r.Forms.RegisterRoutes(api)
    r.Register.RegisterRoutes(api)
    r.Applicants.RegisterRoutes(api)
    r.Devices.RegisterRoutes(api)
    r.Attendance.RegisterRoutes(api)
}
