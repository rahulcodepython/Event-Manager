package router

import (
    "context"

    "github.com/go-webauthn/webauthn/webauthn"
    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/config"
    "identitycard-server/internal/features/applicants"
    "identitycard-server/internal/features/applyflow"
    "identitycard-server/internal/features/auth"
    "identitycard-server/internal/features/cards"
    "identitycard-server/internal/features/contact"
    "identitycard-server/internal/features/credits"
    "identitycard-server/internal/features/attendance"
    "identitycard-server/internal/features/devices"
    "identitycard-server/internal/features/events/dates"
    "identitycard-server/internal/features/events/events"
    "identitycard-server/internal/features/forms"
    "identitycard-server/internal/features/payouts"
    "identitycard-server/internal/features/pricing"
    "identitycard-server/internal/features/register"
    "identitycard-server/internal/features/reminders"
    "identitycard-server/internal/features/retention"
    "identitycard-server/internal/features/sites"
    "identitycard-server/internal/features/uploads"
    "identitycard-server/internal/features/subevents"
    "identitycard-server/internal/generic"
    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/jobqueue"
    "identitycard-server/internal/pkg/mailer"
    "identitycard-server/internal/pkg/qrsign"
    "identitycard-server/internal/pkg/razorpay"
    "identitycard-server/internal/pkg/storage"
)

// AppRouter wires the client-facing API (cmd/server).
type AppRouter struct {
    App     *fiber.App
    CFG     *config.Config
    DB      *pgxpool.Pool
    Redis   *redis.Client
    RootCtx context.Context

    Auth       *auth.App
    Credits    *credits.App
    Events     *events.App
    Dates      *dates.App
    Forms      *forms.App
    Register   *register.App
    Applicants *applicants.App
    Devices    *devices.App
    Attendance *attendance.App
    Pricing    *pricing.App
    Cards      *cards.App
    SubEvents  *subevents.App
    Sites      *sites.App
    Contact    *contact.App
    Uploads    *uploads.App
    Apply      *applyflow.App
    Payouts    *payouts.App
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
    authApp := auth.NewApp(pool, rdb, cfg)
    pricingApp := pricing.NewApp(pool, cch)
    pricingApp.OrgOf = func(c *fiber.Ctx) string {
        id, err := authApp.Sessions.ParseAccess(c.Cookies(authApp.Sessions.AccessCookie()))
        if err != nil {
            return ""
        }
        return id.Org
    }

    applicantsApp := applicants.NewApp(pool, cch)
    eventsApp := events.NewApp(pool, cch)
    eventsApp.DefaultTimezone = cfg.AppTimezone
    store := storage.Connect(rootCtx, cfg)
    sitesApp := sites.NewApp(pool, cch, store, cfg)
    uploadsApp := uploads.NewApp(pool, rdb, store, cfg.QRSigningSecret, cfg.UploadMaxPerHour, cfg.UploadPendingTTL, int64(cfg.FileUploadMaxMB)<<20)
    uploadsApp.StartSweeper(rootCtx)
    eventsApp.OnDelete = append(eventsApp.OnDelete, sitesApp.OnEventDeleted, uploadsApp.OnEventDeleted)
    applicantsApp.OnDelete = append(applicantsApp.OnDelete, uploadsApp.DeleteFiles)
    // Emails (ID cards, reminders, receipts, applications) share one queue.
    mail := mailer.New(cfg.ResendAPIKey, cfg.EmailFrom, cfg.ResendBaseURL)
    emailQueue := jobqueue.New(rdb, "email")
    registerApp := register.NewApp(pool, cch, applicantsApp, uploadsApp)
    rp := razorpay.New(cfg.RazorpayKeyID, cfg.RazorpayKeySecret, cfg.RazorpayBaseURL, cfg.RazorpayV2BaseURL)
    payoutsApp := payouts.NewApp(pool, rp, cfg.RouteCategory, cfg.RouteSubcategory, cfg.PayoutStatusRefresh)
    applyApp := applyflow.NewApp(pool, cfg, applyflow.Deps{
        Register: registerApp, Applicants: applicantsApp, Uploads: uploadsApp,
        Payouts: payoutsApp, Razorpay: rp, Queue: emailQueue, Mailer: mail,
    })
    uploadsApp.Sessions = applyApp.Sessions
    applyApp.StartSweeper(rootCtx)
    retention.NewApp(pool, rdb, eventsApp).StartWorker(rootCtx)

    // The email queue sends one email per EMAIL_SEND_INTERVAL.
    signer := qrsign.New(cfg.QRSigningSecret)
    subEventsApp := subevents.NewApp(pool, cch)
    cardsApp := cards.NewApp(pool, rdb, cch, emailQueue, mail, signer, store)
    remindersApp := reminders.NewApp(pool, rdb, emailQueue, mail, cfg.WebURL)
    contactApp := contact.NewApp(pool, rdb, emailQueue, mail, cfg.ContactEmail, cfg.ContactMaxPerHour)
    creditsApp := credits.NewApp(pool, cfg, pricingApp)
    creditsApp.Queue, creditsApp.Mailer = emailQueue, mail
    creditsApp.OnOtherOrder = applyApp.HandleOrderPaid
    cardsApp.StartScheduler(rootCtx)
    remindersApp.StartScheduler(rootCtx)
    go emailQueue.Run(rootCtx, map[string]jobqueue.Handler{
        cards.JobType:          cardsApp.JobHandler(),
        reminders.JobType:      remindersApp.JobHandler(),
        contact.JobType:        contactApp.JobHandler(),
        credits.ReceiptJobType: creditsApp.ReceiptJobHandler(),
        applyflow.JobConfirmed: applyApp.ConfirmedJobHandler(),
        applyflow.JobRefunded:  applyApp.RefundedJobHandler(),
    }, cfg.EmailSendInterval)

    return &AppRouter{
        App:     app,
        CFG:     cfg,
        DB:      pool,
        Redis:   rdb,
        RootCtx: rootCtx,

        Auth:       authApp,
        Credits:    creditsApp,
        Events:     eventsApp,
        Dates:      dates.NewApp(pool, cch),
        Forms:      forms.NewApp(pool, cch),
        Register:   registerApp,
        Apply:      applyApp,
        Payouts:    payoutsApp,
        Applicants: applicantsApp,
        Devices:    devices.NewApp(pool, rdb, wa, cfg.RPID, cfg.CanonicalOrigin, cfg.DevicePINTTL),
        Attendance: attendance.NewApp(pool, cch, signer, store),
        Pricing:    pricingApp,
        Cards:      cardsApp,
        SubEvents:  subEventsApp,
        Sites:      sitesApp,
        Contact:    contactApp,
        Uploads:    uploadsApp,
    }
}

func (r *AppRouter) SetUp() {
    // The landing site calls the public pricing and contact endpoints.
    useCommonMiddlewares(r.App, r.CFG, r.Redis, r.RootCtx, r.CFG.WebURL+","+r.CFG.LandingURL, "Content-Type,Authorization,X-Device-Token")

    api := r.App.Group(generic.APIV1Prefix)

    // 1. Public: no user session (Google login, pricing, Razorpay webhook,
    //    public registration form, scanner devices with their device token).
    r.Auth.RegisterPublicRoutes(api)
    r.Pricing.RegisterPublicRoutes(api)
    r.Contact.RegisterPublicRoutes(api)
    r.Uploads.RegisterPublicRoutes(api)
    r.Credits.RegisterPublicRoutes(api)
    r.Apply.RegisterRoutes(api) // before Register: owns /public/apply/google/callback
    r.Register.RegisterRoutes(api)
    r.Devices.RegisterPublicRoutes(api)
    api.Use("/events/:eventId/attendance", middlewares.EventWritable(r.DB))
    r.Attendance.RegisterPublicRoutes(api)

    // 2. Logged-in user, organization not required (session, onboarding).
    authed := api.Group("", r.Auth.RequireAuth)
    r.Auth.RegisterRoutes(authed)

    // 3. Logged-in user with an organization. Any route addressing a row by
    //    id 404s unless that row belongs to the caller's organization.
    org := authed.Group("", middlewares.RequireOrganization)
    org.Use("/events/:eventId", middlewares.OwnedBy(r.DB, "events", "eventId"))
    org.Use("/events/:eventId", middlewares.EventWritable(r.DB))
    org.Use("/forms/:formId", middlewares.OwnedBy(r.DB, "form_templates", "formId"))
    org.Use("/devices/:deviceId", middlewares.OwnedBy(r.DB, "devices", "deviceId"))

    r.Credits.RegisterRoutes(org)
    r.Events.RegisterRoutes(org)
    r.SubEvents.RegisterRoutes(org) // before Dates: guards sub-event dates
    r.Dates.RegisterRoutes(org)
    r.Forms.RegisterRoutes(org)
    r.Applicants.RegisterRoutes(org)
    r.Devices.RegisterRoutes(org)
    r.Attendance.RegisterRoutes(org)
    r.Cards.RegisterRoutes(org)
    r.Sites.RegisterRoutes(org)
    r.Uploads.RegisterRoutes(org)
    r.Apply.RegisterOrgRoutes(org)
    r.Payouts.RegisterRoutes(org)
}
