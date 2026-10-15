package credits

import (
    "encoding/json"
    "errors"
    "log/slog"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/features/pricing"
    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/utils"
)

func (h *App) ListCreditsHandler(c *fiber.Ctx) error {
    list, err := h.ListCreditsService(c.UserContext(), middlewares.OrgID(c))
    if err != nil {
        return utils.ErrInternal(c, "failed to list credits", err)
    }
    return utils.OK(c, "credits retrieved", list)
}

func (h *App) RenameCreditHandler(c *fiber.Ctx) error {
    var req RenameCreditRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    credit, err := h.RenameCreditService(c.UserContext(), c.Params("creditId"), req)
    if err != nil {
        if errors.Is(err, ErrInvalidCreditName) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to rename credit", err)
    }
    return utils.OK(c, "credit renamed", credit)
}

func (h *App) ClaimTrialHandler(c *fiber.Ctx) error {
    id, err := h.ClaimTrialService(c.UserContext(), middlewares.OrgID(c))
    if err != nil {
        if errors.Is(err, ErrTrialAlreadyDecided) {
            return utils.ErrConflict(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to start trial", err)
    }
    return utils.Created(c, "free trial started", VerifyPaymentResponse{CreditID: id})
}

func (h *App) SkipTrialHandler(c *fiber.Ctx) error {
    if err := h.SkipTrialService(c.UserContext(), middlewares.OrgID(c)); err != nil {
        return utils.ErrInternal(c, "failed to skip trial", err)
    }
    return utils.OKEmpty(c, "trial skipped")
}

func (h *App) CreateOrderHandler(c *fiber.Ctx) error {
    var req CreateOrderRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    res, err := h.CreateOrderService(c.UserContext(), middlewares.OrgID(c), req)
    if err != nil {
        switch {
        case errors.Is(err, ErrPaymentsNotConfigured):
            return utils.Respond(c, fiber.StatusServiceUnavailable, false, err.Error(), any(nil), err)
        case errors.Is(err, ErrInvalidCreditName),
            errors.Is(err, pricing.ErrUnknownFeature),
            errors.Is(err, pricing.ErrInvalidValue),
            errors.Is(err, pricing.ErrDuplicateKey):
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        slog.Error("create order failed", "error", err)
        return utils.ErrInternal(c, "failed to start payment", err)
    }
    return utils.Created(c, "order created", res)
}

func (h *App) VerifyPaymentHandler(c *fiber.Ctx) error {
    var req VerifyPaymentRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    id, err := h.VerifyPaymentService(c.UserContext(), middlewares.OrgID(c), req)
    if err != nil {
        switch {
        case errors.Is(err, ErrInvalidSignature):
            return utils.ErrBadRequest(c, err.Error(), err)
        case errors.Is(err, ErrOrderNotFound):
            return utils.ErrNotFound(c, err.Error(), err)
        case errors.Is(err, ErrPaymentsNotConfigured):
            return utils.Respond(c, fiber.StatusServiceUnavailable, false, err.Error(), any(nil), err)
        }
        slog.Error("verify payment failed", "error", err)
        return utils.ErrInternal(c, "failed to confirm payment", err)
    }
    return utils.OK(c, "payment confirmed", VerifyPaymentResponse{CreditID: id})
}

// RazorpayWebhookHandler is called by Razorpay, authenticated by signature.
func (h *App) RazorpayWebhookHandler(c *fiber.Ctx) error {
    body := c.Body()
    var event razorpayWebhook
    if err := json.Unmarshal(body, &event); err != nil {
        return utils.ErrBadRequest(c, "invalid webhook body", err)
    }
    if err := h.WebhookService(c.UserContext(), body, c.Get("X-Razorpay-Signature"), event); err != nil {
        if errors.Is(err, ErrInvalidSignature) || errors.Is(err, ErrPaymentsNotConfigured) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        slog.Error("razorpay webhook failed", "error", err, "event", event.Event)
        return utils.ErrInternal(c, "webhook processing failed", err)
    }
    return utils.OKEmpty(c, "ok")
}
