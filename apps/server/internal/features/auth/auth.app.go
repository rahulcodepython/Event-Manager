package auth

import (
    "context"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"
    "golang.org/x/oauth2"
    "golang.org/x/oauth2/endpoints"

    "identitycard-server/internal/config"
    "identitycard-server/internal/pkg/jwtauth"
)

type App struct {
    DB       *pgxpool.Pool
    Redis    *redis.Client
    Cfg      *config.Config
    Google   *oauth2.Config
    Sessions *jwtauth.Manager
}

func NewApp(db *pgxpool.Pool, rdb *redis.Client, cfg *config.Config) *App {
    a := &App{
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
    a.Sessions = jwtauth.New(jwtauth.ClientConfig(cfg), rdb, a.resolveSession)
    return a
}

// resolveSession re-reads the user's organization on every refresh, so a
// token issued before onboarding picks it up and a suspended organization
// cannot refresh.
func (a *App) resolveSession(ctx context.Context, userID string) (jwtauth.Identity, error) {
    org, err := a.GetSessionOrgRepository(ctx, userID)
    if err != nil {
        return jwtauth.Identity{}, err
    }
    if org.Suspended {
        return jwtauth.Identity{}, ErrSuspended
    }
    return jwtauth.Identity{Subject: userID, Org: org.ID}, nil
}
