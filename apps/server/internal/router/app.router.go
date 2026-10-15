package router

import (
    "context"

    "github.com/go-webauthn/webauthn/webauthn"
    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/config"
    "identitycard-server/internal/features/applicants"
    "identitycard-server/internal/features/auth"
    "identitycard-server/internal/features/attendance"
    "identitycard-server/internal/features/devices"
    "identitycard-server/internal/features/events/dates"
    "identitycard-server/internal/features/events/events"
    "identitycard-server/internal/features/forms"
    "identitycard-server/internal/features/register"
    "identitycard-server/internal/generic"
    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/pkg/cache"
)

// AppRouter wires the client-facing API (cmd/server).
type AppRouter struct {
    App     *fiber.App
    CFG     *config.Config
    DB      *pgxpool.Pool
    Redis   *redis.Client
    RootCtx context.Context

    Auth       *auth.App
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
        DB:      pool,
        Redis:   rdb,
        RootCtx: rootCtx,

        Auth:       auth.NewApp(pool, rdb, cfg),
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
    useCommonMiddlewares(r.App, r.CFG, r.Redis, r.RootCtx, r.CFG.WebURL, "Content-Type,Authorization,X-Device-Token")

    api := r.App.Group(generic.APIV1Prefix)

    // 1. Public: no user session (Google login, public registration form,
    //    scanner devices authenticated by their own device token).
    r.Auth.RegisterPublicRoutes(api)
    r.Register.RegisterRoutes(api)
    r.Devices.RegisterPublicRoutes(api)
    r.Attendance.RegisterPublicRoutes(api)

    // 2. Logged-in user, organization not required (session, onboarding).
    authed := api.Group("", r.Auth.RequireAuth)
    r.Auth.RegisterRoutes(authed)

    // 3. Logged-in user with an organization. Any route addressing a row by
    //    id 404s unless that row belongs to the caller's organization.
    org := authed.Group("", middlewares.RequireOrganization)
    org.Use("/events/:eventId", middlewares.OwnedBy(r.DB, "events", "eventId"))
    org.Use("/forms/:formId", middlewares.OwnedBy(r.DB, "form_templates", "formId"))
    org.Use("/devices/:deviceId", middlewares.OwnedBy(r.DB, "devices", "deviceId"))

    r.Events.RegisterRoutes(org)
    r.Dates.RegisterRoutes(org)
    r.Forms.RegisterRoutes(org)
    r.Applicants.RegisterRoutes(org)
    r.Devices.RegisterRoutes(org)
    r.Attendance.RegisterRoutes(org)
}
