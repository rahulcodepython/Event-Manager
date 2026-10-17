package clients

import (
    "errors"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/features/pricing"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/utils"
)

func (h *App) ListHandler(c *fiber.Ctx) error {
    page, limit := utils.PaginationParams(c)
    res, err := h.ListService(c.UserContext(), c.Query("search"), c.Query("status"), page, limit)
    if err != nil {
        return utils.ErrInternal(c, "failed to list clients", err)
    }
    return utils.OK(c, "clients retrieved", res)
}

func (h *App) GetHandler(c *fiber.Ctx) error {
    res, err := h.GetService(c.UserContext(), c.Params("orgId"))
    if err != nil {
        return clientError(c, err)
    }
    return utils.OK(c, "client retrieved", res)
}

func (h *App) SuspendHandler(c *fiber.Ctx) error {
    res, err := h.SetSuspendedService(c.UserContext(), c.Params("orgId"), true)
    if err != nil {
        return clientError(c, err)
    }
    return utils.OK(c, "client suspended", res)
}

func (h *App) UnsuspendHandler(c *fiber.Ctx) error {
    res, err := h.SetSuspendedService(c.UserContext(), c.Params("orgId"), false)
    if err != nil {
        return clientError(c, err)
    }
    return utils.OK(c, "client restored", res)
}

func (h *App) ResetTrialHandler(c *fiber.Ctx) error {
    res, err := h.ResetTrialService(c.UserContext(), c.Params("orgId"))
    if err != nil {
        return clientError(c, err)
    }
    return utils.OK(c, "trial reset", res)
}

func (h *App) GrantCreditHandler(c *fiber.Ctx) error {
    var req GrantCreditRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    res, err := h.GrantCreditService(c.UserContext(), c.Params("orgId"), req)
    if err != nil {
        return clientError(c, err)
    }
    return utils.Created(c, "credit granted", res)
}

func (h *App) RefundHandler(c *fiber.Ctx) error {
    var req RefundRequest
    if len(c.Body()) > 0 {
        if err := c.BodyParser(&req); err != nil {
            return utils.ErrBadRequest(c, "invalid request body", err)
        }
    }
    res, err := h.RefundService(c.UserContext(), c.Params("paymentId"), req)
    if err != nil {
        return clientError(c, err)
    }
    return utils.OK(c, "payment refunded", res)
}

// RequireClient 404s unless /clients/:orgId exists.
func (h *App) RequireClient(c *fiber.Ctx) error {
    ok, err := h.ExistsRepository(c.UserContext(), c.Params("orgId"))
    if err != nil {
        return utils.ErrInternal(c, "failed to load client", err)
    }
    if !ok {
        return utils.ErrNotFound(c, "client not found", nil)
    }
    return c.Next()
}

func clientError(c *fiber.Ctx, err error) error {
    switch {
    case errors.Is(err, ErrInvalidCreditName),
        errors.Is(err, pricing.ErrUnknownFeature),
        errors.Is(err, pricing.ErrInvalidValue),
        errors.Is(err, pricing.ErrDuplicateKey):
        return utils.ErrBadRequest(c, err.Error(), err)
    case errors.Is(err, ErrNotRefundable):
        return utils.ErrConflict(c, err.Error(), err)
    case errors.Is(err, postgres.ErrNotFound):
        return utils.ErrNotFound(c, "not found", err)
    }
    return utils.ErrInternal(c, "client request failed", err)
}
