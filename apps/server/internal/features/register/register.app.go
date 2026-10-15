package register

import (
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/features/applicants"
    "identitycard-server/internal/features/uploads"
    "identitycard-server/internal/pkg/cache"
)

type App struct {
    DB         *pgxpool.Pool
    Cache      *cache.Cache
    Applicants *applicants.App
    Uploads    *uploads.App
}

func NewApp(db *pgxpool.Pool, cache *cache.Cache, applicantsApp *applicants.App, uploadsApp *uploads.App) *App {
    return &App{DB: db, Cache: cache, Applicants: applicantsApp, Uploads: uploadsApp}
}
