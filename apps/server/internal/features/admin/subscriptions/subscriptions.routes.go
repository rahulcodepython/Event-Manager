package subscriptions

import (
    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/middlewares"
)

func (h *App) RegisterRoutes(r fiber.Router) {
    group := r.Group("/subscriptions")
    group.Get("", h.ListHandler)
    group.Post("", h.CreateHandler)
    group.Use("/:subscriptionId", middlewares.UUIDParam("subscriptionId"))
    group.Patch("/:subscriptionId", h.UpdateHandler)
    group.Delete("/:subscriptionId", h.DeleteHandler)
    group.Post("/:subscriptionId/renew", h.RenewHandler)
}
