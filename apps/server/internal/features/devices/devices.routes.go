package devices

import "github.com/gofiber/fiber/v2"

// RegisterPublicRoutes mounts the scanner-device endpoints, authenticated
// by pairing PIN, WebAuthn or the X-Device-Token header instead of a user session.
func (h *App) RegisterPublicRoutes(api fiber.Router) {
    group := api.Group("/devices")
    group.Get("/me", h.GetMyDeviceHandler)
    group.Post("/verify", h.VerifyDeviceHandler)
    group.Post("/unpair", h.UnpairHandler)
    group.Post("/webauthn/register-options", h.WebAuthnRegisterOptionsHandler)
    group.Post("/webauthn/register-verify", h.WebAuthnRegisterVerifyHandler)
    group.Post("/webauthn/login-options", h.WebAuthnLoginOptionsHandler)
    group.Post("/webauthn/login-verify", h.WebAuthnLoginVerifyHandler)
}

// RegisterRoutes mounts the organization's device management endpoints.
func (h *App) RegisterRoutes(api fiber.Router) {
    devices := api.Group("/devices")
    devices.Post("/", h.CreateDeviceHandler)
    devices.Get("/", h.ListDevicesHandler)
    devices.Patch("/:id", h.UpdateDeviceHandler)
    devices.Post("/:id/regenerate-pin", h.RegeneratePINHandler)
    devices.Delete("/:id", h.DeleteDeviceHandler)

    eventDevices := api.Group("/events/:eventId/devices")
    eventDevices.Get("/", h.ListEventDevicesHandler)
    eventDevices.Get("/available", h.ListAvailableGlobalDevicesHandler)
    eventDevices.Post("/assign", h.AssignEventDevicesHandler)
    eventDevices.Delete("/:deviceId", h.UnassignEventDeviceHandler)
}
