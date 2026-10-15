package router

import (
    "context"
    "log/slog"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/compress"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/helmet"
    "github.com/gofiber/fiber/v2/middleware/recover"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/config"
    "identitycard-server/internal/generic"
    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/utils"
)

// NewFiberApp creates a Fiber app with the defaults shared by every binary.
func NewFiberApp(cfg *config.Config, name string) *fiber.App {
    return fiber.New(fiber.Config{
        AppName:                 name,
        ErrorHandler:            utils.ErrorHandler,
        BodyLimit:               1 * 1024 * 1024,
        ReadBufferSize:          16 * 1024,
        EnableTrustedProxyCheck: true,
        TrustedProxies:          cfg.TrustedProxies,
        ProxyHeader:             fiber.HeaderXForwardedFor,
    })
}

// useCommonMiddlewares installs the middleware stack and health check shared
// by the app and admin routers. allowOrigins and allowHeaders feed CORS.
func useCommonMiddlewares(app *fiber.App, cfg *config.Config, rdb *redis.Client, rootCtx context.Context, allowOrigins, allowHeaders string) {
    // 1. Per-request context bounded by request timeout and server lifecycle
    app.Use(middlewares.RequestContextMiddleware(rootCtx, time.Duration(cfg.RequestTimeoutSec)*time.Second))
    // 2. Structured request logging
    app.Use(middlewares.LoggerMiddleware())
    // 3. Outermost panic recovery
    app.Use(recover.New())
    // 4. Standard security headers
    app.Use(helmet.New())
    // 5. Response compression
    app.Use(compress.New())
    // 6. CORS
    app.Use(cors.New(cors.Config{
        AllowOrigins:     allowOrigins,
        AllowHeaders:     allowHeaders,
        AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        AllowCredentials: true,
    }))
    // 7. Rate limiting: Redis token bucket per client IP
    app.Use(middlewares.RateLimiterMiddleware(rdb))

    app.Get(generic.RouteHealth, func(c *fiber.Ctx) error {
        return utils.OK(c, generic.MsgStatusOk, fiber.Map{"status": generic.MsgStatusOk})
    })
}

// Listen serves app on port and shuts it down gracefully on SIGINT/SIGTERM,
// cancelling the root context so background workers stop too.
func Listen(app *fiber.App, port string, cancel context.CancelFunc) error {
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    go func() {
        <-quit
        slog.Info("shutting down server")
        cancel()

        shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
        defer shutdownCancel()
        if err := app.ShutdownWithContext(shutdownCtx); err != nil {
            slog.Error("shutdown error", "error", err)
        }
    }()

    addr := ":" + port
    slog.Info("listening", "app", app.Config().AppName, "addr", addr)
    return app.Listen(addr)
}
