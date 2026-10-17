package auth

import (
    "errors"
    "log/slog"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/pkg/jwtauth"
    "identitycard-server/internal/utils"
)

// RequireAuth accepts a request with a valid session (see
// jwtauth.Manager.Authenticate) whose organization is not suspended.
// Anything else clears both cookies and returns 401, which tells the web
// app to log the user out.
func (s *App) RequireAuth(c *fiber.Ctx) error {
    id, err := s.Sessions.Authenticate(c)
    if err != nil {
        if !errors.Is(err, jwtauth.ErrInvalidSession) && !errors.Is(err, ErrSuspended) {
            slog.Warn("session refresh failed", "error", err)
        }
        return s.unauthorized(c)
    }

    if id.Org != "" {
        suspended, err := s.IsSuspendedRepository(c.UserContext(), id.Org)
        if err != nil {
            return utils.ErrInternal(c, "failed to verify session", err)
        }
        if suspended {
            return s.unauthorized(c)
        }
    }

    middlewares.SetIdentity(c, id.Subject, id.Org)
    return c.Next()
}

func (s *App) unauthorized(c *fiber.Ctx) error {
    s.Sessions.ClearCookies(c)
    return utils.ErrUnauthorized(c, "session expired, please log in again", nil)
}
