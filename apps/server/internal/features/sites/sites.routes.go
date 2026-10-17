package sites

import "github.com/gofiber/fiber/v2"

func (h *App) RegisterRoutes(r fiber.Router) {
    group := r.Group("/events/:eventId/site")
    group.Get("/", h.GetHandler)
    group.Get("/check", h.CheckHandler)
    group.Put("/", h.ClaimHandler)
    group.Post("/upload", h.UploadHandler)
    group.Delete("/", h.DeleteHandler)
}
