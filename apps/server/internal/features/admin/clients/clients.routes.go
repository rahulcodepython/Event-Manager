package clients

import (
    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/middlewares"
)

func (h *App) RegisterRoutes(r fiber.Router) {
    group := r.Group("/clients")
    group.Get("", h.ListHandler)
    group.Use("/:orgId", middlewares.UUIDParam("orgId"), h.RequireClient)
    group.Get("/:orgId", h.GetHandler)
    group.Post("/:orgId/suspend", h.SuspendHandler)
    group.Post("/:orgId/unsuspend", h.UnsuspendHandler)
    group.Post("/:orgId/reset-trial", h.ResetTrialHandler)
    group.Post("/:orgId/credits", h.GrantCreditHandler)

    r.Use("/payments/:paymentId", middlewares.UUIDParam("paymentId"))
    r.Post("/payments/:paymentId/refund", h.RefundHandler)
}
