package pricing

import (
    "errors"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/utils"
)

func (h *App) CatalogHandler(c *fiber.Ctx) error {
    res, err := h.CatalogService(c.UserContext())
    if err != nil {
        return utils.ErrInternal(c, "failed to load pricing", err)
    }
    return utils.OK(c, "pricing catalog retrieved", res)
}

func (h *App) QuoteHandler(c *fiber.Ctx) error {
    var req QuoteRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }

    q, err := h.QuoteService(c.UserContext(), req.Selections)
    if err != nil {
        if errors.Is(err, ErrUnknownFeature) || errors.Is(err, ErrInvalidValue) || errors.Is(err, ErrDuplicateKey) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to calculate price", err)
    }
    // A coupon that does not apply still returns the full price, with the reason.
    if req.CouponCode != "" {
        if err := h.ApplyCoupon(c.UserContext(), q, req.CouponCode, ""); err != nil {
            if !errors.Is(err, ErrCoupon) {
                return utils.ErrInternal(c, "failed to check coupon", err)
            }
            q.CouponError = err.Error()
        }
    }
    return utils.OK(c, "quote calculated", q)
}
