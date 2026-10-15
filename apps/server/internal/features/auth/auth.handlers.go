package auth

import (
    "crypto/rand"
    "encoding/base64"
    "errors"
    "log/slog"
    "net/url"
    "time"

    "github.com/gofiber/fiber/v2"
    "golang.org/x/oauth2"

    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/utils"
)

const (
    stateCookie    = "oauth_state"
    verifierCookie = "oauth_verifier"
    oauthCookieTTL = 10 * time.Minute
)

// GoogleRedirectHandler starts the Google OAuth flow (state + PKCE).
func (h *App) GoogleRedirectHandler(c *fiber.Ctx) error {
    if h.Cfg.GoogleClientID == "" || h.Cfg.GoogleClientSecret == "" {
        return h.redirectToLogin(c, "google_not_configured")
    }

    state := randomToken()
    verifier := oauth2.GenerateVerifier()
    h.setOAuthCookie(c, stateCookie, state)
    h.setOAuthCookie(c, verifierCookie, verifier)

    return c.Redirect(h.Google.AuthCodeURL(state, oauth2.S256ChallengeOption(verifier)), fiber.StatusFound)
}

// GoogleCallbackHandler finishes the OAuth flow, sets the session cookies and
// sends the user to the dashboard, or to onboarding on first login.
func (h *App) GoogleCallbackHandler(c *fiber.Ctx) error {
    state := c.Cookies(stateCookie)
    verifier := c.Cookies(verifierCookie)
    h.setOAuthCookie(c, stateCookie, "")
    h.setOAuthCookie(c, verifierCookie, "")

    if c.Query("error") != "" {
        return h.redirectToLogin(c, "google_denied")
    }
    if state == "" || verifier == "" || c.Query("state") != state {
        return h.redirectToLogin(c, "invalid_state")
    }

    pair, id, err := h.GoogleLoginService(c.UserContext(), c.Query("code"), verifier)
    if err != nil {
        slog.Error("google login failed", "error", err)
        if errors.Is(err, ErrEmailNotVerified) {
            return h.redirectToLogin(c, "email_not_verified")
        }
        return h.redirectToLogin(c, "login_failed")
    }

    h.setAuthCookies(c, pair)
    next := "/dashboard"
    if id.OrgID == "" {
        next = "/onboarding"
    }
    return c.Redirect(h.Cfg.WebURL+next, fiber.StatusFound)
}

func (h *App) MeHandler(c *fiber.Ctx) error {
    me, err := h.MeService(c.UserContext(), middlewares.UserID(c))
    if err != nil {
        return h.unauthorized(c)
    }
    return utils.OK(c, "session retrieved", me)
}

func (h *App) OnboardingHandler(c *fiber.Ctx) error {
    var req OnboardingRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }

    org, pair, err := h.OnboardingService(c.UserContext(), middlewares.UserID(c), req)
    if err != nil {
        if errors.Is(err, ErrInvalidOrgName) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrAlreadyOnboarded) {
            return utils.ErrConflict(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to create organization", err)
    }

    h.revoke(c.UserContext(), c.Cookies(refreshCookie))
    h.setAuthCookies(c, pair)
    return utils.Created(c, "organization created", org)
}

func (h *App) LogoutHandler(c *fiber.Ctx) error {
    h.revoke(c.UserContext(), c.Cookies(refreshCookie))
    h.clearAuthCookies(c)
    return utils.OKEmpty(c, "logged out")
}

func (h *App) redirectToLogin(c *fiber.Ctx, reason string) error {
    return c.Redirect(h.Cfg.WebURL+"/login?error="+url.QueryEscape(reason), fiber.StatusFound)
}

// setOAuthCookie stores short-lived OAuth values; an empty value deletes it.
func (h *App) setOAuthCookie(c *fiber.Ctx, name, value string) {
    maxAge := int(oauthCookieTTL.Seconds())
    if value == "" {
        maxAge = -1
    }
    c.Cookie(&fiber.Cookie{
        Name:     name,
        Value:    value,
        Path:     "/api/v1/auth",
        MaxAge:   maxAge,
        HTTPOnly: true,
        Secure:   h.Cfg.IsProduction(),
        SameSite: fiber.CookieSameSiteLaxMode,
    })
}

func randomToken() string {
    b := make([]byte, 32)
    _, _ = rand.Read(b)
    return base64.RawURLEncoding.EncodeToString(b)
}
