package auth

import (
    "context"
    "errors"
    "fmt"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
)

const (
    accessCookie  = "access_token"
    refreshCookie = "refresh_token"

    // How long a just-rotated refresh token is still accepted, so parallel
    // requests that all carry the old token don't log the user out.
    rotationGrace = 30 * time.Second

    redisKeyRefresh     = "auth:refresh:%s"      // jti -> user id
    redisKeyRotated     = "auth:refresh:old:%s"  // jti rotated within the grace window
    redisKeyUserRefresh = "auth:user_refresh:%s" // user id -> set of jtis
)

var (
    ErrInvalidSession = errors.New("invalid or expired session")
    ErrTokenReuse     = errors.New("refresh token reuse detected")
)

type tokenPair struct {
    Access  string
    Refresh string
}

// issueTokens signs a new access + refresh pair and records the refresh
// token's id in Redis.
func (s *App) issueTokens(ctx context.Context, id identity) (*tokenPair, error) {
    now := time.Now()

    access, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims{
        Org: id.OrgID,
        RegisteredClaims: jwt.RegisteredClaims{
            Subject:   id.UserID,
            IssuedAt:  jwt.NewNumericDate(now),
            ExpiresAt: jwt.NewNumericDate(now.Add(s.Cfg.AccessTokenTTL)),
        },
    }).SignedString([]byte(s.Cfg.JWTAccessSecret))
    if err != nil {
        return nil, err
    }

    jti := uuid.NewString()
    refresh, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims{
        RegisteredClaims: jwt.RegisteredClaims{
            ID:        jti,
            Subject:   id.UserID,
            IssuedAt:  jwt.NewNumericDate(now),
            ExpiresAt: jwt.NewNumericDate(now.Add(s.Cfg.RefreshTokenTTL)),
        },
    }).SignedString([]byte(s.Cfg.JWTRefreshSecret))
    if err != nil {
        return nil, err
    }

    userSet := fmt.Sprintf(redisKeyUserRefresh, id.UserID)
    pipe := s.Redis.TxPipeline()
    pipe.Set(ctx, fmt.Sprintf(redisKeyRefresh, jti), id.UserID, s.Cfg.RefreshTokenTTL)
    pipe.SAdd(ctx, userSet, jti)
    pipe.Expire(ctx, userSet, s.Cfg.RefreshTokenTTL)
    if _, err := pipe.Exec(ctx); err != nil {
        return nil, err
    }

    return &tokenPair{Access: access, Refresh: refresh}, nil
}

// parseAccess validates an access token. A correctly signed but expired
// token returns an error wrapping jwt.ErrTokenExpired.
func (s *App) parseAccess(token string) (identity, error) {
    var claims accessClaims
    _, err := jwt.ParseWithClaims(token, &claims, func(*jwt.Token) (any, error) {
        return []byte(s.Cfg.JWTAccessSecret), nil
    }, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
    if err != nil {
        return identity{}, err
    }
    return identity{UserID: claims.Subject, OrgID: claims.Org}, nil
}

func (s *App) parseRefresh(token string, opts ...jwt.ParserOption) (*refreshClaims, error) {
    var claims refreshClaims
    opts = append(opts, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
    _, err := jwt.ParseWithClaims(token, &claims, func(*jwt.Token) (any, error) {
        return []byte(s.Cfg.JWTRefreshSecret), nil
    }, opts...)
    if err != nil {
        return nil, err
    }
    return &claims, nil
}

// rotate exchanges a refresh token for a new pair. Each refresh token works
// once (plus a short grace window); reusing an older one revokes every
// session of that user.
func (s *App) rotate(ctx context.Context, refreshToken string) (*tokenPair, identity, error) {
    claims, err := s.parseRefresh(refreshToken)
    if err != nil {
        return nil, identity{}, ErrInvalidSession
    }

    removed, err := s.Redis.Del(ctx, fmt.Sprintf(redisKeyRefresh, claims.ID)).Result()
    if err != nil {
        return nil, identity{}, err
    }
    if removed == 1 {
        if err := s.Redis.Set(ctx, fmt.Sprintf(redisKeyRotated, claims.ID), "1", rotationGrace).Err(); err != nil {
            return nil, identity{}, err
        }
    } else {
        inGrace, err := s.Redis.Exists(ctx, fmt.Sprintf(redisKeyRotated, claims.ID)).Result()
        if err != nil {
            return nil, identity{}, err
        }
        if inGrace == 0 {
            _ = s.revokeAll(ctx, claims.Subject)
            return nil, identity{}, ErrTokenReuse
        }
    }

    // Read the org fresh so a token issued before onboarding picks it up.
    orgID, err := s.GetOrganizationIDRepository(ctx, claims.Subject)
    if err != nil {
        return nil, identity{}, err
    }
    id := identity{UserID: claims.Subject, OrgID: orgID}

    pair, err := s.issueTokens(ctx, id)
    if err != nil {
        return nil, identity{}, err
    }
    return pair, id, nil
}

// revoke invalidates one refresh token, even if it has already expired.
func (s *App) revoke(ctx context.Context, refreshToken string) {
    claims, err := s.parseRefresh(refreshToken, jwt.WithoutClaimsValidation())
    if err != nil {
        return
    }
    _ = s.Redis.Del(ctx, fmt.Sprintf(redisKeyRefresh, claims.ID)).Err()
    _ = s.Redis.SRem(ctx, fmt.Sprintf(redisKeyUserRefresh, claims.Subject), claims.ID).Err()
}

// revokeAll invalidates every refresh token of a user.
func (s *App) revokeAll(ctx context.Context, userID string) error {
    userSet := fmt.Sprintf(redisKeyUserRefresh, userID)
    jtis, err := s.Redis.SMembers(ctx, userSet).Result()
    if err != nil {
        return err
    }
    keys := []string{userSet}
    for _, jti := range jtis {
        keys = append(keys, fmt.Sprintf(redisKeyRefresh, jti))
    }
    return s.Redis.Del(ctx, keys...).Err()
}

// setAuthCookies writes both tokens. Both cookies live as long as the
// refresh token so an expired access token still reaches the server and can
// be refreshed; the JWT's own exp decides validity.
func (s *App) setAuthCookies(c *fiber.Ctx, pair *tokenPair) {
    for name, value := range map[string]string{accessCookie: pair.Access, refreshCookie: pair.Refresh} {
        c.Cookie(&fiber.Cookie{
            Name:     name,
            Value:    value,
            Path:     "/",
            MaxAge:   int(s.Cfg.RefreshTokenTTL.Seconds()),
            HTTPOnly: true,
            Secure:   s.Cfg.IsProduction(),
            SameSite: fiber.CookieSameSiteLaxMode,
        })
    }
}

func (s *App) clearAuthCookies(c *fiber.Ctx) {
    for _, name := range []string{accessCookie, refreshCookie} {
        c.Cookie(&fiber.Cookie{
            Name:     name,
            Value:    "",
            Path:     "/",
            MaxAge:   -1,
            Expires:  time.Unix(0, 0),
            HTTPOnly: true,
            Secure:   s.Cfg.IsProduction(),
            SameSite: fiber.CookieSameSiteLaxMode,
        })
    }
}
