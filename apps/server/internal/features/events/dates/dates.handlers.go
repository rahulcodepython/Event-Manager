package dates

import (
    "errors"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/utils"
)

// ListHandler returns all event dates for an event, optionally filtered by month (YYYY-MM).
func (h *App) ListHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")
    month := c.Query("month")

    res, err := h.ListByMonthService(c.UserContext(), eventID, c.Params("subEventId"), month)
    if err != nil {
        if errors.Is(err, ErrInvalidDateFormat) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to retrieve event dates", err)
    }

    return utils.OK(c, "event dates retrieved successfully", res)
}

// OverrideHandler deletes all existing event dates and inserts the provided batch in a single atomic database round-trip.
func (h *App) OverrideHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    req, err := utils.ParseBody[BulkUpsertEventDatesRequest](c.Body())
    if err != nil {
        return utils.ErrBadRequest(c, err.Error(), err)
    }

    res, err := h.OverrideService(c.UserContext(), eventID, c.Params("subEventId"), *req)
    if err != nil {
        if errors.Is(err, ErrEventNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        if errors.Is(err, ErrDateOutOfRange) ||
            errors.Is(err, ErrInvalidDateFormat) ||
            errors.Is(err, ErrInvalidTimeFormat) ||
            errors.Is(err, ErrInvalidTimeOrder) ||
            errors.Is(err, ErrEmptyDates) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to override event dates", err)
    }

    return utils.OK(c, "event dates overridden successfully", res)
}

// SyncHandler synchronizes event dates (deleting and upserting) in a single database round-trip.
func (h *App) SyncHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    req, err := utils.ParseBody[SyncEventDatesRequest](c.Body())
    if err != nil {
        return utils.ErrBadRequest(c, err.Error(), err)
    }

    res, err := h.SyncService(c.UserContext(), eventID, c.Params("subEventId"), *req)
    if err != nil {
        if errors.Is(err, ErrEventNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        if errors.Is(err, ErrDateOutOfRange) ||
            errors.Is(err, ErrInvalidDateFormat) ||
            errors.Is(err, ErrInvalidTimeFormat) ||
            errors.Is(err, ErrInvalidTimeOrder) ||
            errors.Is(err, ErrEmptyDates) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to sync event dates", err)
    }

    return utils.OK(c, "event dates synchronized successfully", res)
}
