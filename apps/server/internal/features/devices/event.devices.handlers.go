package devices

import (
    "errors"
    "log/slog"

    "github.com/gofiber/fiber/v2"
    "identitycard-server/internal/generic"
    "identitycard-server/internal/utils"
)

func (h *App) ListEventDevicesHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    list, err := h.ListEventDevicesService(c.UserContext(), eventID)
    if err != nil {
        slog.Error("failed to list event devices", "error", err, "eventId", eventID)
        if errors.Is(err, ErrInvalidEventID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to list event devices", err)
    }

    return utils.OK(c, "event devices retrieved successfully", list)
}

func (h *App) ListAvailableGlobalDevicesHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    list, err := h.ListAvailableGlobalDevicesService(c.UserContext(), eventID)
    if err != nil {
        slog.Error("failed to list available devices", "error", err, "eventId", eventID)
        if errors.Is(err, ErrInvalidEventID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to list available devices", err)
    }

    return utils.OK(c, "available devices retrieved successfully", list)
}

func (h *App) AssignEventDevicesHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")
    var req AssignEventDevicesRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request payload", err)
    }

    err := h.AssignEventDevicesService(c.UserContext(), eventID, req)
    if err != nil {
        slog.Error("failed to assign devices to event", "error", err, "eventId", eventID)
        if errors.Is(err, ErrInvalidEventID) || errors.Is(err, ErrInvalidDeviceID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to assign devices", err)
    }

    return utils.OK(c, "devices assigned to event successfully", generic.SuccessResponse{Success: true})
}

func (h *App) UnassignEventDeviceHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")
    deviceID := c.Params("deviceId")

    err := h.UnassignEventDeviceService(c.UserContext(), eventID, deviceID)
    if err != nil {
        slog.Error("failed to unassign event device", "error", err, "eventId", eventID, "deviceId", deviceID)
        if errors.Is(err, ErrDeviceNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        if errors.Is(err, ErrInvalidEventID) || errors.Is(err, ErrInvalidDeviceID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to unassign device", err)
    }

    return utils.OK(c, "device unassigned from event successfully", generic.DeleteResponse{ID: deviceID})
}
