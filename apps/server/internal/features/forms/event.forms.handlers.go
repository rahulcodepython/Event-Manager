package forms

import (
    "errors"
    "log/slog"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/utils"
)

func (h *App) GetEventFormHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    form, err := h.GetEventFormService(c.UserContext(), eventID)
    if err != nil {
        if errors.Is(err, ErrInvalidEventID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrEventFormNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        slog.Error("failed to get event form", "error", err, "eventId", eventID)
        return utils.ErrInternal(c, "failed to get event form", err)
    }

    return utils.OK(c, "event form retrieved successfully", form)
}

func (h *App) CreateEventFormHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    var req CreateEventFormRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }

    form, err := h.CreateEventFormService(c.UserContext(), eventID, req)
    if err != nil {
        if errors.Is(err, ErrInvalidEventID) ||
            errors.Is(err, ErrInvalidTemplateID) ||
            errors.Is(err, ErrInvalidExpiresAt) ||
            errors.Is(err, ErrInvalidMaxApplicants) || errors.Is(err, ErrCapacityAboveCredit) ||
            errors.Is(err, ErrInvalidFormName) ||
            errors.Is(err, ErrMissingMandatoryFields) || errors.Is(err, ErrInvalidFieldType) ||
            errors.Is(err, ErrInvalidSource) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrEventFormAlreadyExists) {
            return utils.ErrConflict(c, err.Error(), err)
        }
        slog.Error("failed to create event form", "error", err, "eventId", eventID)
        return utils.ErrInternal(c, "failed to create event form", err)
    }

    return utils.Created(c, "event form created successfully", form)
}

func (h *App) UpdateEventFormHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    var req UpdateEventFormRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }

    form, err := h.UpdateEventFormService(c.UserContext(), eventID, req)
    if err != nil {
        if errors.Is(err, ErrInvalidEventID) ||
            errors.Is(err, ErrInvalidExpiresAt) ||
            errors.Is(err, ErrInvalidMaxApplicants) || errors.Is(err, ErrCapacityAboveCredit) ||
            errors.Is(err, ErrInvalidFormName) ||
            errors.Is(err, ErrMissingMandatoryFields) || errors.Is(err, ErrInvalidFieldType) ||
            errors.Is(err, ErrFormIsLocked) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrEventFormNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        slog.Error("failed to update event form", "error", err, "eventId", eventID)
        return utils.ErrInternal(c, "failed to update event form", err)
    }

    return utils.OK(c, "event form updated successfully", form)
}

func (h *App) LockEventFormHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    form, err := h.LockEventFormService(c.UserContext(), eventID)
    if err != nil {
        if errors.Is(err, ErrInvalidEventID) ||
            errors.Is(err, ErrInvalidExpiresAt) ||
            errors.Is(err, ErrMissingMandatoryFields) || errors.Is(err, ErrInvalidFieldType) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrEventFormNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        slog.Error("failed to lock event form", "error", err, "eventId", eventID)
        return utils.ErrInternal(c, "failed to lock event form", err)
    }

    return utils.OK(c, "event form locked successfully", form)
}

func (h *App) DeleteEventFormHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    err := h.DeleteEventFormService(c.UserContext(), eventID)
    if err != nil {
        if errors.Is(err, ErrInvalidEventID) || errors.Is(err, ErrCannotDeleteWithApplicants) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrEventFormNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        slog.Error("failed to delete event form", "error", err, "eventId", eventID)
        return utils.ErrInternal(c, "failed to delete event form", err)
    }

    return utils.OK(c, "event form deleted successfully", fiber.Map{"deleted": true})
}
