package session

import (
    "errors"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/utils"
)

func (h *App) LoginHandler(c *fiber.Ctx) error {
    var req LoginRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    pair, err := h.LoginService(c.UserContext(), c.IP(), req)
    if err != nil {
        switch {
        case errors.Is(err, ErrInvalidCredentials):
            return utils.ErrUnauthorized(c, err.Error(), err)
        case errors.Is(err, ErrTooManyAttempts):
            return utils.ErrTooManyRequests(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to log in", err)
    }
    h.Sessions.SetCookies(c, pair)
    return utils.OK(c, "logged in", MeResponse{Username: h.Cfg.AdminUsername})
}

func (h *App) LogoutHandler(c *fiber.Ctx) error {
    h.Sessions.Revoke(c.UserContext(), c.Cookies(h.Sessions.RefreshCookie()))
    h.Sessions.ClearCookies(c)
    return utils.OKEmpty(c, "logged out")
}

func (h *App) MeHandler(c *fiber.Ctx) error {
    return utils.OK(c, "session retrieved", MeResponse{Username: h.Cfg.AdminUsername})
}

// RequireAdmin accepts a request with a valid admin session; anything else
// clears the cookies and returns 401.
func (h *App) RequireAdmin(c *fiber.Ctx) error {
    id, err := h.Sessions.Authenticate(c)
    if err != nil || id.Subject != h.Cfg.AdminUsername {
        h.Sessions.ClearCookies(c)
        return utils.ErrUnauthorized(c, "session expired, please log in again", nil)
    }
    return c.Next()
}
