package events

import (
    "github.com/gofiber/fiber/v2"
)

// RegisterRoutes registers HTTP routes for the events resource.
func (h *App) RegisterRoutes(r fiber.Router) {
    group := r.Group("/events")

    group.Get("/", h.ListHandler)
    group.Post("/", h.CreateHandler)
    group.Get("/:id", h.GetHandler)
    group.Patch("/:id", h.UpdateHandler)
    group.Delete("/:id", h.DeleteHandler)
}
