package pricing

import (
    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/pkg/cache"
)

type App struct {
    DB    *pgxpool.Pool
    Cache *cache.Cache
    // OrgOf returns the signed-in client's organization, or "" for a
    // visitor. The quote endpoint stays public.
    OrgOf func(c *fiber.Ctx) string
}

func NewApp(db *pgxpool.Pool, cache *cache.Cache) *App {
    return &App{DB: db, Cache: cache}
}
