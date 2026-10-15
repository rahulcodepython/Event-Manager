package pricing

import "github.com/gofiber/fiber/v2"

// RegisterPublicRoutes mounts the catalog and quote endpoints. They are
// public so the landing page can show prices before sign-up.
func (h *App) RegisterPublicRoutes(r fiber.Router) {
    group := r.Group("/pricing")
    group.Get("/catalog", h.CatalogHandler)
    group.Post("/quote", h.QuoteHandler)
}
