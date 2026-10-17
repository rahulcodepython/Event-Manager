package subevents

import (
    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/middlewares"
)

// RegisterRoutes mounts sub-event routes. It must run before the dates
// feature registers /events/:eventId/sub-events/:subEventId/dates, so the
// ownership check covers those too.
func (h *App) RegisterRoutes(r fiber.Router) {
    r.Get("/events/:eventId/sub-events", h.OverviewHandler)
    r.Post("/events/:eventId/sub-events", h.CreateHandler)
    r.Put("/events/:eventId/sub-event-settings", h.SettingsHandler)

    r.Use("/events/:eventId/sub-events/:subEventId", middlewares.UUIDParam("subEventId"), h.RequireSubEvent)
    one := r.Group("/events/:eventId/sub-events/:subEventId")
    one.Patch("/", h.UpdateHandler)
    one.Delete("/", h.DeleteHandler)
    one.Get("/applicants", h.ListEnrolledHandler)
    one.Post("/applicants", h.AssignHandler)
    one.Delete("/applicants/:applicantId", h.UnassignHandler)
}
