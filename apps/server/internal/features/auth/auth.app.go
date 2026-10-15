package auth

import (
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"
    "golang.org/x/oauth2"
    "golang.org/x/oauth2/endpoints"

    "identitycard-server/internal/config"
)

type App struct {
    DB     *pgxpool.Pool
    Redis  *redis.Client
    Cfg    *config.Config
    Google *oauth2.Config
}

func NewApp(db *pgxpool.Pool, rdb *redis.Client, cfg *config.Config) *App {
    return &App{
        DB:    db,
        Redis: rdb,
        Cfg:   cfg,
        Google: &oauth2.Config{
            ClientID:     cfg.GoogleClientID,
            ClientSecret: cfg.GoogleClientSecret,
            RedirectURL:  cfg.APIURL + "/api/v1/auth/google/callback",
            Scopes:       []string{"openid", "email", "profile"},
            Endpoint:     endpoints.Google,
        },
    }
}
