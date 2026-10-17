package catalog

import "github.com/gofiber/fiber/v2"

func (h *App) RegisterRoutes(r fiber.Router) {
    group := r.Group("/catalog")
    group.Get("", h.GetCatalogHandler)
    group.Put("/settings", h.UpdateSettingsHandler)
    group.Put("/features/:featureId", h.UpdateFeatureHandler)
}
