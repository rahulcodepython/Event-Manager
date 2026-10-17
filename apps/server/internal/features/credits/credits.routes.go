package credits

import (
    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/middlewares"
)

// RegisterPublicRoutes mounts the Razorpay webhook (signature-authenticated).
func (h *App) RegisterPublicRoutes(r fiber.Router) {
    r.Post("/payments/razorpay/webhook", h.RazorpayWebhookHandler)
}

// RegisterRoutes mounts the organization's credit endpoints.
func (h *App) RegisterRoutes(r fiber.Router) {
    group := r.Group("/credits")
    group.Get("/", h.ListCreditsHandler)
    group.Post("/trial", h.ClaimTrialHandler)
    group.Post("/trial/skip", h.SkipTrialHandler)
    group.Post("/orders", h.CreateOrderHandler)
    group.Post("/orders/verify", h.VerifyPaymentHandler)
    // Guarded per route: a prefix guard would also catch /trial and /orders.
    group.Patch("/:creditId", middlewares.OwnedBy(h.DB, "credits", "creditId"), h.RenameCreditHandler)
}
