package cards

import (
    "errors"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/utils"
)

func (h *App) StatusHandler(c *fiber.Ctx) error {
    res, err := h.StatusService(c.UserContext(), c.Params("eventId"))
    if err != nil {
        return cardsError(c, err)
    }
    return utils.OK(c, "card status retrieved", res)
}

func (h *App) ScheduleHandler(c *fiber.Ctx) error {
    var req ScheduleRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    res, err := h.ScheduleService(c.UserContext(), c.Params("eventId"), req)
    if err != nil {
        return cardsError(c, err)
    }
    return utils.OK(c, "schedule saved", res)
}

func (h *App) CloseNowHandler(c *fiber.Ctx) error {
    res, err := h.CloseNowService(c.UserContext(), c.Params("eventId"))
    if err != nil {
        return cardsError(c, err)
    }
    return utils.OK(c, "applications closed", res)
}

func (h *App) PublishNowHandler(c *fiber.Ctx) error {
    res, err := h.PublishNowService(c.UserContext(), c.Params("eventId"))
    if err != nil {
        return cardsError(c, err)
    }
    return utils.OK(c, "cards published", res)
}

func (h *App) ResendHandler(c *fiber.Ctx) error {
    var req ResendRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    res, err := h.ResendService(c.UserContext(), c.Params("eventId"), req)
    if err != nil {
        return cardsError(c, err)
    }
    return utils.OK(c, "cards queued", res)
}

func (h *App) ResendOneHandler(c *fiber.Ctx) error {
    res, err := h.ResendOneService(c.UserContext(), c.Params("eventId"), c.Params("applicantId"))
    if err != nil {
        return cardsError(c, err)
    }
    return utils.OK(c, "card queued", res)
}

func (h *App) CardPDFHandler(c *fiber.Ctx) error {
    pdf, filename, err := h.CardPDFService(c.UserContext(), c.Params("eventId"), c.Params("applicantId"))
    if err != nil {
        return cardsError(c, err)
    }
    c.Set(fiber.HeaderContentType, "application/pdf")
    c.Set(fiber.HeaderContentDisposition, `attachment; filename="`+filename+`"`)
    return c.Send(pdf)
}

func (h *App) QRHandler(c *fiber.Ctx) error {
    res, err := h.QRService(c.UserContext(), c.Params("eventId"), c.Params("applicantId"))
    if err != nil {
        return cardsError(c, err)
    }
    return utils.OK(c, "qr retrieved", res)
}

func cardsError(c *fiber.Ctx, err error) error {
    switch {
    case errors.Is(err, ErrInvalidSchedule), errors.Is(err, ErrInvalidScope):
        return utils.ErrBadRequest(c, err.Error(), err)
    case errors.Is(err, ErrNoForm), errors.Is(err, postgres.ErrNotFound):
        return utils.ErrNotFound(c, "not found: "+err.Error(), err)
    case errors.Is(err, ErrPublished), errors.Is(err, ErrNotPublished),
        errors.Is(err, ErrWindowOpen), errors.Is(err, ErrNothingToSend):
        return utils.ErrConflict(c, err.Error(), err)
    }
    return utils.ErrInternal(c, "card request failed", err)
}
