package jwtauth

import "identitycard-server/internal/config"

// ClientConfig is the session of client users (Google login) on the client
// API. The admin API builds it too, to revoke a suspended client's sessions.
func ClientConfig(cfg *config.Config) Config {
    return Config{
        Audience:      "client",
        AccessSecret:  cfg.JWTAccessSecret,
        RefreshSecret: cfg.JWTRefreshSecret,
        AccessTTL:     cfg.AccessTokenTTL,
        RefreshTTL:    cfg.RefreshTokenTTL,
        KeyPrefix:     "auth",
        Secure:        cfg.IsProduction(),
    }
}

// AdminConfig is the platform admin's session on the admin API. Its own
// secrets, cookies and Redis keys keep it apart from client sessions.
func AdminConfig(cfg *config.Config) Config {
    return Config{
        Audience:      "admin",
        AccessSecret:  cfg.AdminJWTAccessSecret,
        RefreshSecret: cfg.AdminJWTRefreshSecret,
        AccessTTL:     cfg.AccessTokenTTL,
        RefreshTTL:    cfg.RefreshTokenTTL,
        CookiePrefix:  "admin_",
        KeyPrefix:     "admin_auth",
        Secure:        cfg.IsProduction(),
    }
}
