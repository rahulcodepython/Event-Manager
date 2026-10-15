// Package session is the platform admin's login on the admin API: one
// account from the environment (ADMIN_USERNAME / ADMIN_PASSWORD) and a
// jwtauth cookie session in the "admin" realm.
package session

import (
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/config"
    "identitycard-server/internal/pkg/jwtauth"
)

type App struct {
    Cfg      *config.Config
    Redis    *redis.Client
    Sessions *jwtauth.Manager
}

func NewApp(cfg *config.Config, rdb *redis.Client) *App {
    return &App{
        Cfg:      cfg,
        Redis:    rdb,
        Sessions: jwtauth.New(jwtauth.AdminConfig(cfg), rdb, nil),
    }
}
