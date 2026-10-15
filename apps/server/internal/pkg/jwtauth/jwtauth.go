// Package jwtauth is the cookie session used by both servers: a short-lived
// access JWT plus a sliding refresh JWT, both in HttpOnly cookies. Refresh
// tokens are tracked in Redis: each works once (plus a short grace window
// for parallel requests) and reusing an older one revokes every session of
// that subject.
//
// Each server builds its own Manager. The audience claim, cookie names and
// Redis keys differ per manager, so a client session never authenticates
// on the admin API and the reverse.
package jwtauth

import (
    "context"
    "errors"
    "fmt"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
    "github.com/redis/go-redis/v9"
)

// How long a just-rotated refresh token is still accepted, so parallel
// requests that all carry the old token don't log the user out.
const rotationGrace = 30 * time.Second

var (
    ErrInvalidSession = errors.New("invalid or expired session")
    ErrTokenReuse     = errors.New("refresh token reuse detected")
)

type Config struct {
    // Audience names the realm ("client", "admin"); tokens of another
    // realm are rejected.
    Audience      string
    AccessSecret  string
    RefreshSecret string
    AccessTTL     time.Duration
    RefreshTTL    time.Duration
    // CookiePrefix is prepended to the cookie names ("" gives
    // access_token / refresh_token).
    CookiePrefix string
    // KeyPrefix namespaces the Redis keys, e.g. "auth".
    KeyPrefix string
    Secure    bool
}

// Identity is what a valid session resolves to. Org is empty when the
// realm has no organizations (admin) or before onboarding (client).
type Identity struct {
    Subject string
    Org     string
}

type Tokens struct {
    Access  string
    Refresh string
}

// ResolveFunc re-reads mutable identity data when a session is refreshed,
// e.g. the organization a client created after the token was issued. It
// returns an error to refuse the refresh (user gone, account suspended).
type ResolveFunc func(ctx context.Context, subject string) (Identity, error)

type Manager struct {
    cfg     Config
    redis   *redis.Client
    resolve ResolveFunc
}

// New builds a Manager. resolve may be nil, in which case a refreshed
// session keeps the subject and has no organization.
func New(cfg Config, rdb *redis.Client, resolve ResolveFunc) *Manager {
    if resolve == nil {
        resolve = func(_ context.Context, subject string) (Identity, error) {
            return Identity{Subject: subject}, nil
        }
    }
    return &Manager{cfg: cfg, redis: rdb, resolve: resolve}
}

type accessClaims struct {
    Org string `json:"org,omitempty"`
    jwt.RegisteredClaims
}

// refreshClaims: sub = subject, jti = refresh token id tracked in Redis.
type refreshClaims struct {
    jwt.RegisteredClaims
}

func (m *Manager) AccessCookie() string  { return m.cfg.CookiePrefix + "access_token" }
func (m *Manager) RefreshCookie() string { return m.cfg.CookiePrefix + "refresh_token" }

func (m *Manager) refreshKey(jti string) string    { return fmt.Sprintf("%s:refresh:%s", m.cfg.KeyPrefix, jti) }
func (m *Manager) rotatedKey(jti string) string    { return fmt.Sprintf("%s:refresh:old:%s", m.cfg.KeyPrefix, jti) }
func (m *Manager) subjectKey(subject string) string { return fmt.Sprintf("%s:user_refresh:%s", m.cfg.KeyPrefix, subject) }

// Issue signs a new access + refresh pair and records the refresh token's
// id in Redis.
func (m *Manager) Issue(ctx context.Context, id Identity) (*Tokens, error) {
    now := time.Now()
    audience := jwt.ClaimStrings{m.cfg.Audience}

    access, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims{
        Org: id.Org,
        RegisteredClaims: jwt.RegisteredClaims{
            Subject:   id.Subject,
            Audience:  audience,
            IssuedAt:  jwt.NewNumericDate(now),
            ExpiresAt: jwt.NewNumericDate(now.Add(m.cfg.AccessTTL)),
        },
    }).SignedString([]byte(m.cfg.AccessSecret))
    if err != nil {
        return nil, err
    }

    jti := uuid.NewString()
    refresh, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims{
        RegisteredClaims: jwt.RegisteredClaims{
            ID:        jti,
            Subject:   id.Subject,
            Audience:  audience,
            IssuedAt:  jwt.NewNumericDate(now),
            ExpiresAt: jwt.NewNumericDate(now.Add(m.cfg.RefreshTTL)),
        },
    }).SignedString([]byte(m.cfg.RefreshSecret))
    if err != nil {
        return nil, err
    }

    subjectSet := m.subjectKey(id.Subject)
    pipe := m.redis.TxPipeline()
    pipe.Set(ctx, m.refreshKey(jti), id.Subject, m.cfg.RefreshTTL)
    pipe.SAdd(ctx, subjectSet, jti)
    pipe.Expire(ctx, subjectSet, m.cfg.RefreshTTL)
    if _, err := pipe.Exec(ctx); err != nil {
        return nil, err
    }

    return &Tokens{Access: access, Refresh: refresh}, nil
}

func (m *Manager) parserOptions(extra ...jwt.ParserOption) []jwt.ParserOption {
    return append(extra,
        jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
        jwt.WithAudience(m.cfg.Audience),
    )
}

// ParseAccess validates an access token. A correctly signed but expired
// token returns an error wrapping jwt.ErrTokenExpired.
func (m *Manager) ParseAccess(token string) (Identity, error) {
    var claims accessClaims
    _, err := jwt.ParseWithClaims(token, &claims, func(*jwt.Token) (any, error) {
        return []byte(m.cfg.AccessSecret), nil
    }, m.parserOptions()...)
    if err != nil {
        return Identity{}, err
    }
    return Identity{Subject: claims.Subject, Org: claims.Org}, nil
}

func (m *Manager) parseRefresh(token string, opts ...jwt.ParserOption) (*refreshClaims, error) {
    var claims refreshClaims
    _, err := jwt.ParseWithClaims(token, &claims, func(*jwt.Token) (any, error) {
        return []byte(m.cfg.RefreshSecret), nil
    }, m.parserOptions(opts...)...)
    if err != nil {
        return nil, err
    }
    return &claims, nil
}

// Rotate exchanges a refresh token for a new pair.
func (m *Manager) Rotate(ctx context.Context, refreshToken string) (*Tokens, Identity, error) {
    claims, err := m.parseRefresh(refreshToken)
    if err != nil {
        return nil, Identity{}, ErrInvalidSession
    }

    removed, err := m.redis.Del(ctx, m.refreshKey(claims.ID)).Result()
    if err != nil {
        return nil, Identity{}, err
    }
    if removed == 1 {
        if err := m.redis.Set(ctx, m.rotatedKey(claims.ID), "1", rotationGrace).Err(); err != nil {
            return nil, Identity{}, err
        }
    } else {
        inGrace, err := m.redis.Exists(ctx, m.rotatedKey(claims.ID)).Result()
        if err != nil {
            return nil, Identity{}, err
        }
        if inGrace == 0 {
            _ = m.RevokeAll(ctx, claims.Subject)
            return nil, Identity{}, ErrTokenReuse
        }
    }

    id, err := m.resolve(ctx, claims.Subject)
    if err != nil {
        return nil, Identity{}, err
    }

    pair, err := m.Issue(ctx, id)
    if err != nil {
        return nil, Identity{}, err
    }
    return pair, id, nil
}

// Revoke invalidates one refresh token, even if it has already expired.
func (m *Manager) Revoke(ctx context.Context, refreshToken string) {
    claims, err := m.parseRefresh(refreshToken, jwt.WithoutClaimsValidation())
    if err != nil {
        return
    }
    _ = m.redis.Del(ctx, m.refreshKey(claims.ID)).Err()
    _ = m.redis.SRem(ctx, m.subjectKey(claims.Subject), claims.ID).Err()
}

// RevokeAll invalidates every refresh token of a subject. Access tokens
// already issued stay valid until they expire (AccessTTL).
func (m *Manager) RevokeAll(ctx context.Context, subject string) error {
    subjectSet := m.subjectKey(subject)
    jtis, err := m.redis.SMembers(ctx, subjectSet).Result()
    if err != nil {
        return err
    }
    keys := []string{subjectSet}
    for _, jti := range jtis {
        keys = append(keys, m.refreshKey(jti))
    }
    return m.redis.Del(ctx, keys...).Err()
}

// Authenticate resolves the request's session. A valid access token is
// used as is; a missing or correctly signed but expired one is replaced by
// rotating the refresh token, and the new cookies are set on c. Any other
// failure returns ErrInvalidSession (or the resolve error).
func (m *Manager) Authenticate(c *fiber.Ctx) (Identity, error) {
    if access := c.Cookies(m.AccessCookie()); access != "" {
        id, err := m.ParseAccess(access)
        if err == nil {
            return id, nil
        }
        if !errors.Is(err, jwt.ErrTokenExpired) {
            return Identity{}, ErrInvalidSession
        }
    }

    refresh := c.Cookies(m.RefreshCookie())
    if refresh == "" {
        return Identity{}, ErrInvalidSession
    }

    pair, id, err := m.Rotate(c.UserContext(), refresh)
    if err != nil {
        return Identity{}, err
    }
    m.SetCookies(c, pair)
    return id, nil
}

// SetCookies writes both tokens. Both cookies live as long as the refresh
// token so an expired access token still reaches the server and can be
// refreshed; the JWT's own exp decides validity.
func (m *Manager) SetCookies(c *fiber.Ctx, pair *Tokens) {
    for name, value := range map[string]string{m.AccessCookie(): pair.Access, m.RefreshCookie(): pair.Refresh} {
        c.Cookie(&fiber.Cookie{
            Name:     name,
            Value:    value,
            Path:     "/",
            MaxAge:   int(m.cfg.RefreshTTL.Seconds()),
            HTTPOnly: true,
            Secure:   m.cfg.Secure,
            SameSite: fiber.CookieSameSiteLaxMode,
        })
    }
}

func (m *Manager) ClearCookies(c *fiber.Ctx) {
    for _, name := range []string{m.AccessCookie(), m.RefreshCookie()} {
        c.Cookie(&fiber.Cookie{
            Name:     name,
            Value:    "",
            Path:     "/",
            MaxAge:   -1,
            Expires:  time.Unix(0, 0),
            HTTPOnly: true,
            Secure:   m.cfg.Secure,
            SameSite: fiber.CookieSameSiteLaxMode,
        })
    }
}
