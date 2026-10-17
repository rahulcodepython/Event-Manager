package dashboard

import "github.com/gofiber/fiber/v2"

func (h *App) RegisterRoutes(r fiber.Router) {
    r.Get("/dashboard", h.GetHandler)
}
