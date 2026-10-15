package attendance

import (
    "github.com/gofiber/fiber/v2"
)

// RegisterPublicRoutes mounts the scanner endpoints, authenticated by the
// X-Device-Token header instead of a user session.
func (h *App) RegisterPublicRoutes(r fiber.Router) {
    group := r.Group("/events/:eventId/attendance")
    group.Post("/scan", h.ScanApplicantHandler)
    group.Post("/entry", h.MarkEntryHandler)
    group.Post("/exit", h.MarkExitHandler)

    r.Get("/attendance/sub-events", h.ListDeviceSubEventsHandler)
}

// RegisterRoutes mounts the organization's analysis endpoints.
func (h *App) RegisterRoutes(r fiber.Router) {
    group := r.Group("/events/:eventId/analysis")
    group.Get("/metrics", h.GetAttendanceMetricsHandler)
    group.Get("/attendees", h.ListAttendeeAnalysisHandler)
}
