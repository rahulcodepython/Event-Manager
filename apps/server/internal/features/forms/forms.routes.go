package forms

import "github.com/gofiber/fiber/v2"

// RegisterRoutes registers all global and event form routes.
func (h *App) RegisterRoutes(r fiber.Router) {
    h.RegisterGlobalFormRoutes(r)
    h.RegisterEventFormRoutes(r)
}
