package auth

import (
    "errors"
    "log/slog"

    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"

    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/utils"
)

// RequireAuth accepts a request with a valid access token. If the access
// token is correctly signed but expired (or missing), it rotates the refresh
// token, sets new cookies and continues. Anything else clears both cookies
// and returns 401, which tells the web app to log the user out.
func (s *App) RequireAuth(c *fiber.Ctx) error {
    if access := c.Cookies(accessCookie); access != "" {
        id, err := s.parseAccess(access)
        if err == nil {
            middlewares.SetIdentity(c, id.UserID, id.OrgID)
            return c.Next()
        }
        if !errors.Is(err, jwt.ErrTokenExpired) {
            return s.unauthorized(c)
        }
    }

    refresh := c.Cookies(refreshCookie)
    if refresh == "" {
        return s.unauthorized(c)
    }

    pair, id, err := s.rotate(c.UserContext(), refresh)
    if err != nil {
        if !errors.Is(err, ErrInvalidSession) {
            slog.Warn("session refresh failed", "error", err)
        }
        return s.unauthorized(c)
    }

    s.setAuthCookies(c, pair)
    middlewares.SetIdentity(c, id.UserID, id.OrgID)
    return c.Next()
}

func (s *App) unauthorized(c *fiber.Ctx) error {
    s.clearAuthCookies(c)
    return utils.ErrUnauthorized(c, "session expired, please log in again", nil)
}
