package subevents

import (
    "errors"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/pkg/entitlements"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/utils"
)

func (h *App) OverviewHandler(c *fiber.Ctx) error {
    res, err := h.OverviewService(c.UserContext(), c.Params("eventId"))
    if err != nil {
        return subEventError(c, err)
    }
    return utils.OK(c, "sub-events retrieved", res)
}

func (h *App) CreateHandler(c *fiber.Ctx) error {
    var req SubEventRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    res, err := h.CreateService(c.UserContext(), c.Params("eventId"), req)
    if err != nil {
        return subEventError(c, err)
    }
    return utils.Created(c, "sub-event created", res)
}

func (h *App) UpdateHandler(c *fiber.Ctx) error {
    var req SubEventRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    res, err := h.UpdateService(c.UserContext(), c.Params("subEventId"), req)
    if err != nil {
        return subEventError(c, err)
    }
    return utils.OK(c, "sub-event saved", res)
}

func (h *App) DeleteHandler(c *fiber.Ctx) error {
    if err := h.DeleteService(c.UserContext(), c.Params("eventId"), c.Params("subEventId")); err != nil {
        return subEventError(c, err)
    }
    return utils.OKEmpty(c, "sub-event deleted")
}

func (h *App) SettingsHandler(c *fiber.Ctx) error {
    var req SettingsRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    res, err := h.SettingsService(c.UserContext(), c.Params("eventId"), req)
    if err != nil {
        return subEventError(c, err)
    }
    return utils.OK(c, "settings saved", res)
}

func (h *App) ListEnrolledHandler(c *fiber.Ctx) error {
    page, limit := utils.PaginationParams(c)
    res, err := h.ListEnrolledService(c.UserContext(), c.Params("subEventId"), c.Query("search"), page, limit)
    if err != nil {
        return subEventError(c, err)
    }
    return utils.OK(c, "enrolled applicants retrieved", res)
}

func (h *App) AssignHandler(c *fiber.Ctx) error {
    var req AssignRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    res, err := h.AssignService(c.UserContext(), c.Params("eventId"), c.Params("subEventId"), req)
    if err != nil {
        return subEventError(c, err)
    }
    return utils.OK(c, "applicants assigned", res)
}

func (h *App) UnassignHandler(c *fiber.Ctx) error {
    if err := h.UnassignService(c.UserContext(), c.Params("eventId"), c.Params("subEventId"), c.Params("applicantId")); err != nil {
        return subEventError(c, err)
    }
    return utils.OKEmpty(c, "applicant removed from sub-event")
}

// RequireSubEvent 404s unless /sub-events/:subEventId belongs to the event.
func (h *App) RequireSubEvent(c *fiber.Ctx) error {
    ok, err := h.BelongsRepository(c.UserContext(), c.Params("eventId"), c.Params("subEventId"))
    if err != nil {
        return utils.ErrInternal(c, "failed to load sub-event", err)
    }
    if !ok {
        return utils.ErrNotFound(c, "sub-event not found", nil)
    }
    return c.Next()
}

func subEventError(c *fiber.Ctx, err error) error {
    switch {
    case errors.Is(err, ErrInvalid), errors.Is(err, ErrInvalidSetting), errors.Is(err, ErrCapBelowCount):
        return utils.ErrBadRequest(c, err.Error(), err)
    case errors.Is(err, ErrLimitReached), errors.Is(err, ErrNoSubEvents),
        errors.Is(err, entitlements.ErrApplicationsClosed):
        return utils.ErrForbidden(c, err.Error(), err)
    case errors.Is(err, ErrNoForm), errors.Is(err, ErrNotEnrolled), errors.Is(err, postgres.ErrNotFound):
        return utils.ErrNotFound(c, err.Error(), err)
    }
    return utils.ErrInternal(c, "sub-event request failed", err)
}
