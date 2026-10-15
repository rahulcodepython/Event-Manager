package subscriptions

import (
    "errors"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/utils"
)

func (h *App) ListHandler(c *fiber.Ctx) error {
    list, err := h.ListService(c.UserContext())
    if err != nil {
        return utils.ErrInternal(c, "failed to list subscriptions", err)
    }
    return utils.OK(c, "subscriptions retrieved", list)
}

func (h *App) CreateHandler(c *fiber.Ctx) error {
    var req SubscriptionRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    sub, err := h.CreateService(c.UserContext(), req)
    if err != nil {
        return subscriptionError(c, err)
    }
    return utils.Created(c, "subscription created", sub)
}

func (h *App) UpdateHandler(c *fiber.Ctx) error {
    var req SubscriptionRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    sub, err := h.UpdateService(c.UserContext(), c.Params("subscriptionId"), req)
    if err != nil {
        return subscriptionError(c, err)
    }
    return utils.OK(c, "subscription saved", sub)
}

func (h *App) DeleteHandler(c *fiber.Ctx) error {
    if err := h.DeleteService(c.UserContext(), c.Params("subscriptionId")); err != nil {
        return subscriptionError(c, err)
    }
    return utils.OKEmpty(c, "subscription deleted")
}

func (h *App) RenewHandler(c *fiber.Ctx) error {
    var req RenewRequest
    if len(c.Body()) > 0 {
        if err := c.BodyParser(&req); err != nil {
            return utils.ErrBadRequest(c, "invalid request body", err)
        }
    }
    sub, err := h.RenewService(c.UserContext(), c.Params("subscriptionId"), req)
    if err != nil {
        return subscriptionError(c, err)
    }
    return utils.OK(c, "renewal recorded", sub)
}

func subscriptionError(c *fiber.Ctx, err error) error {
    switch {
    case errors.Is(err, ErrInvalidSubscription):
        return utils.ErrBadRequest(c, err.Error(), err)
    case errors.Is(err, postgres.ErrNotFound):
        return utils.ErrNotFound(c, "subscription not found or inactive", err)
    }
    return utils.ErrInternal(c, "subscription request failed", err)
}
