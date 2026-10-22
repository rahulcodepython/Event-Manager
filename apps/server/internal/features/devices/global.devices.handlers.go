package devices

import (
    "errors"
    "log/slog"
    "strings"
    "time"

    "github.com/gofiber/fiber/v2"
    "identitycard-server/internal/generic"
    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/utils"
)

func (h *App) CreateDeviceHandler(c *fiber.Ctx) error {
    var req CreateDeviceRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request payload", err)
    }

    device, err := h.CreateDeviceService(c.UserContext(), middlewares.OrgID(c), req)
    if err != nil {
        slog.Error("failed to create device", "error", err)
        if errors.Is(err, ErrEmptyDeviceName) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to create device", err)
    }

    return utils.Created(c, "device created successfully", device)
}

func (h *App) ListDevicesHandler(c *fiber.Ctx) error {
    page, limit := utils.PaginationParams(c)
    search := c.Query("search")

    devices, total, err := h.ListDevicesService(c.UserContext(), middlewares.OrgID(c), search, page, limit)
    if err != nil {
        slog.Error("failed to list devices", "error", err)
        return utils.ErrInternal(c, "failed to list devices", err)
    }

    res := generic.PaginatedResponse[[]Device]{
        Data:  devices,
        Total: total,
        Page:  page,
        Limit: limit,
    }

    return utils.OK(c, "devices retrieved successfully", res)
}

func (h *App) UpdateDeviceHandler(c *fiber.Ctx) error {
    id := c.Params("id")
    var req UpdateDeviceRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request payload", err)
    }

    device, err := h.UpdateDeviceService(c.UserContext(), id, req)
    if err != nil {
        slog.Error("failed to update device", "error", err, "id", id)
        if errors.Is(err, ErrDeviceNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        if errors.Is(err, ErrInvalidDeviceID) || errors.Is(err, ErrEmptyDeviceName) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to update device", err)
    }

    return utils.OK(c, "device updated successfully", device)
}

func (h *App) RegeneratePINHandler(c *fiber.Ctx) error {
    id := c.Params("id")

    device, err := h.RegeneratePINService(c.UserContext(), id)
    if err != nil {
        slog.Error("failed to regenerate pin", "error", err, "id", id)
        if errors.Is(err, ErrDeviceNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        if errors.Is(err, ErrInvalidDeviceID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to regenerate pin", err)
    }

    return utils.OK(c, "pin regenerated successfully", device)
}

func (h *App) DeleteDeviceHandler(c *fiber.Ctx) error {
    id := c.Params("id")

    err := h.DeleteDeviceService(c.UserContext(), id)
    if err != nil {
        slog.Error("failed to delete device", "error", err, "id", id)
        if errors.Is(err, ErrDeviceNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        if errors.Is(err, ErrInvalidDeviceID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to delete device", err)
    }

    return utils.OK(c, "device deleted successfully", generic.DeleteResponse{ID: id})
}

func (h *App) VerifyDeviceHandler(c *fiber.Ctx) error {
    var req VerifyDeviceRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid verification payload", err)
    }

    clientIP := c.IP()
    res, err := h.VerifyDeviceService(c.UserContext(), clientIP, req)
    if err != nil {
        slog.Warn("device verification failed", "error", err, "ip", clientIP)
        if errors.Is(err, ErrRateLimitExceeded) {
            return utils.Respond(c, fiber.StatusTooManyRequests, false, err.Error(), any(nil), err)
        }
        if errors.Is(err, ErrTooManyWrongGuesses) {
            return utils.Respond(c, fiber.StatusTooManyRequests, false, err.Error(), any(nil), err)
        }
        if errors.Is(err, ErrDeviceAlreadyPairedWithOther) {
            return utils.Respond(c, fiber.StatusConflict, false, err.Error(), any(nil), err)
        }
        if errors.Is(err, ErrInvalidPIN) || errors.Is(err, ErrPINExpired) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "verification failed", err)
    }

    // Set persistent secure cookie for future device requests
    c.Cookie(&fiber.Cookie{
        Name:     "device_token",
        Value:    res.Token,
        Expires:  time.Now().Add(365 * 24 * time.Hour),
        HTTPOnly: true,
        Secure:   c.Protocol() == "https",
        SameSite: "Lax",
        Path:     "/",
    })

    return utils.OK(c, "device verified and paired successfully", res)
}

// deviceToken reads this browser's device token: cookie, bearer or header.
func deviceToken(c *fiber.Ctx) string {
    token := c.Cookies("device_token")
    if token == "" {
        authHeader := c.Get("Authorization")
        if strings.HasPrefix(authHeader, "Bearer ") {
            token = strings.TrimPrefix(authHeader, "Bearer ")
        }
    }
    if token == "" {
        token = c.Get("X-Device-Token")
    }
    return token
}

func (h *App) GetMyDeviceHandler(c *fiber.Ctx) error {
    token := deviceToken(c)
    if token == "" {
        return utils.ErrUnauthorized(c, "missing device authorization token", errors.New("unauthorized"))
    }

    device, err := h.AuthenticateDeviceTokenService(c.UserContext(), token)
    if err != nil {
        if errors.Is(err, ErrDeviceExpired) {
            return utils.Respond(c, fiber.StatusForbidden, false, err.Error(), any(nil), err)
        }
        return utils.ErrUnauthorized(c, err.Error(), err)
    }

    return utils.OK(c, "device session active", device)
}

func (h *App) WebAuthnRegisterOptionsHandler(c *fiber.Ctx) error {
    var req WebAuthnRegisterOptionsRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request payload", err)
    }

    clientIP := c.IP()
    res, err := h.WebAuthnRegisterOptionsService(c.UserContext(), clientIP, deviceToken(c), req)
    if err != nil {
        slog.Warn("webauthn registration options failed", "error", err, "ip", clientIP)
        if errors.Is(err, ErrRateLimitExceeded) || errors.Is(err, ErrTooManyWrongGuesses) {
            return utils.Respond(c, fiber.StatusTooManyRequests, false, err.Error(), any(nil), err)
        }
        if errors.Is(err, ErrInvalidPIN) || errors.Is(err, ErrPINExpired) || errors.Is(err, ErrNotPaired) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrDeviceExpired) {
            return utils.ErrForbidden(c, err.Error(), err)
        }
        if errors.Is(err, ErrDeviceNotFound) {
            return utils.ErrUnauthorized(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to generate registration options", err)
    }

    return utils.OK(c, "registration options generated", res)
}

func (h *App) WebAuthnRegisterVerifyHandler(c *fiber.Ctx) error {
    var req WebAuthnRegisterVerifyRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request payload", err)
    }

    clientIP := c.IP()
    res, err := h.WebAuthnRegisterVerifyService(c.UserContext(), clientIP, req)
    if err != nil {
        slog.Warn("webauthn registration verify failed", "error", err, "ip", clientIP)
        if errors.Is(err, ErrWebAuthnSessionExpired) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrWebAuthnVerificationFailed) {
            return utils.Respond(c, fiber.StatusUnprocessableEntity, false, err.Error(), any(nil), err)
        }
        if errors.Is(err, ErrDeviceAlreadyPairedWithOther) {
            return utils.Respond(c, fiber.StatusConflict, false, err.Error(), any(nil), err)
        }
        return utils.ErrInternal(c, "failed to verify registration", err)
    }

    c.Cookie(&fiber.Cookie{
        Name:     "device_token",
        Value:    res.Token,
        Expires:  time.Now().Add(365 * 24 * time.Hour),
        HTTPOnly: true,
        Secure:   c.Protocol() == "https",
        SameSite: "Lax",
        Path:     "/",
    })

    return utils.OK(c, "biometric passkey registered successfully", res)
}

func (h *App) WebAuthnLoginOptionsHandler(c *fiber.Ctx) error {
    var req WebAuthnLoginOptionsRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request payload", err)
    }

    clientIP := c.IP()
    res, err := h.WebAuthnLoginOptionsService(c.UserContext(), clientIP, req)
    if err != nil {
        slog.Warn("webauthn login options failed", "error", err, "ip", clientIP)
        if errors.Is(err, ErrDeviceNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        if errors.Is(err, ErrWebAuthnNotEnrolled) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrDeviceExpired) {
            return utils.Respond(c, fiber.StatusForbidden, false, err.Error(), any(nil), err)
        }
        return utils.ErrInternal(c, "failed to generate login options", err)
    }

    return utils.OK(c, "login options generated", res)
}

func (h *App) WebAuthnLoginVerifyHandler(c *fiber.Ctx) error {
    var req WebAuthnLoginVerifyRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request payload", err)
    }

    clientIP := c.IP()
    res, err := h.WebAuthnLoginVerifyService(c.UserContext(), clientIP, req)
    if err != nil {
        slog.Warn("webauthn login verify failed", "error", err, "ip", clientIP)
        if errors.Is(err, ErrWebAuthnSessionExpired) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrWebAuthnVerificationFailed) {
            return utils.Respond(c, fiber.StatusUnauthorized, false, err.Error(), any(nil), err)
        }
        if errors.Is(err, ErrDeviceExpired) {
            return utils.ErrForbidden(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to verify biometric login", err)
    }

    c.Cookie(&fiber.Cookie{
        Name:     "device_token",
        Value:    res.Token,
        Expires:  time.Now().Add(365 * 24 * time.Hour),
        HTTPOnly: true,
        Secure:   c.Protocol() == "https",
        SameSite: "Lax",
        Path:     "/",
    })

    return utils.OK(c, "biometric login successful", res)
}

// UnpairHandler ends this browser's pairing on the server and drops its cookie.
func (h *App) UnpairHandler(c *fiber.Ctx) error {
    err := h.UnpairService(c.UserContext(), deviceToken(c))
    c.Cookie(&fiber.Cookie{
        Name:     "device_token",
        Value:    "",
        Expires:  time.Unix(0, 0),
        MaxAge:   -1,
        HTTPOnly: true,
        Secure:   c.Protocol() == "https",
        SameSite: "Lax",
        Path:     "/",
    })
    if err != nil {
        if errors.Is(err, ErrNotPaired) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to unpair device", err)
    }
    return utils.OKEmpty(c, "device unpaired")
}
