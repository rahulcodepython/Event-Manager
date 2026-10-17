package events

import (
    "errors"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/generic"
    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/utils"
)

// ListHandler returns a paginated list of events.
func (h *App) ListHandler(c *fiber.Ctx) error {
    page, limit := utils.PaginationParams(c)
    search := c.Query("search")

    res, err := h.ListService(c.UserContext(), middlewares.OrgID(c), search, page, limit)
    if err != nil {
        return utils.ErrInternal(c, "failed to list events", err)
    }

    return utils.OK(c, "events retrieved successfully", res)
}

// GetHandler returns a single event by ID.
func (h *App) GetHandler(c *fiber.Ctx) error {
    id := c.Params("id")

    ev, err := h.GetService(c.UserContext(), id)
    if err != nil {
        if errors.Is(err, ErrInvalidEventID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrEventNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to get event", err)
    }

    return utils.OK(c, "event retrieved successfully", ev)
}

// CreateHandler handles event creation.
func (h *App) CreateHandler(c *fiber.Ctx) error {
    req, err := utils.ParseBody[CreateEventRequest](c.Body())
    if err != nil {
        return utils.ErrBadRequest(c, err.Error(), err)
    }

    ev, err := h.CreateService(c.UserContext(), middlewares.OrgID(c), *req)
    if err != nil {
        if errors.Is(err, ErrInvalidDateFormat) || errors.Is(err, ErrInvalidDateRange) || IsCreditError(err) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }

        return utils.ErrInternal(c, "failed to create event", err)
    }

    return utils.Created(c, "event created successfully", ev)
}

// UpdateHandler handles event modification.
func (h *App) UpdateHandler(c *fiber.Ctx) error {
    id := c.Params("id")

    req, err := utils.ParseBody[UpdateEventRequest](c.Body())
    if err != nil {
        return utils.ErrBadRequest(c, err.Error(), err)
    }

    ev, err := h.UpdateService(c.UserContext(), middlewares.OrgID(c), id, *req)
    if err != nil {
        if errors.Is(err, ErrInvalidEventID) || errors.Is(err, ErrInvalidDateFormat) || errors.Is(err, ErrInvalidDateRange) || errors.Is(err, ErrEventEnded) || IsCreditError(err) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrEventNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to update event", err)
    }

    return utils.OK(c, "event updated successfully", ev)
}

// DeleteHandler removes an event.
func (h *App) DeleteHandler(c *fiber.Ctx) error {
    id := c.Params("id")

    if err := h.DeleteService(c.UserContext(), id); err != nil {
        if errors.Is(err, ErrInvalidEventID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrEventNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to delete event", err)
    }

    return utils.OK(c, "event deleted successfully", generic.DeleteResponse{ID: id})
}
