package session

import (
    "context"
    "errors"
    "fmt"

    "identitycard-server/internal/pkg/jwtauth"
)

var (
    ErrInvalidCredentials = errors.New("invalid username or password")
    ErrTooManyAttempts    = errors.New("too many failed logins, try again later")
)

// LoginService checks the credentials against the environment and starts
// a session. Each client IP gets maxFailedLogins attempts per failWindow.
func (s *App) LoginService(ctx context.Context, ip string, req LoginRequest) (*jwtauth.Tokens, error) {
    failKey := fmt.Sprintf(redisKeyFailedLogins, ip)
    failed, err := s.Redis.Get(ctx, failKey).Int()
    if err == nil && failed >= maxFailedLogins {
        return nil, ErrTooManyAttempts
    }

    userOK := equal(req.Username, s.Cfg.AdminUsername)
    passOK := equal(req.Password, s.Cfg.AdminPassword)
    if !userOK || !passOK {
        pipe := s.Redis.TxPipeline()
        pipe.Incr(ctx, failKey)
        pipe.Expire(ctx, failKey, failWindow)
        _, _ = pipe.Exec(ctx)
        return nil, ErrInvalidCredentials
    }

    _ = s.Redis.Del(ctx, failKey).Err()
    return s.Sessions.Issue(ctx, jwtauth.Identity{Subject: s.Cfg.AdminUsername})
}
