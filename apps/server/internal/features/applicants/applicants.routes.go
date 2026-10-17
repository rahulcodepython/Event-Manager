package applicants

import (
    "github.com/gofiber/fiber/v2"
)

func (h *App) RegisterRoutes(r fiber.Router) {
    group := r.Group("/events/:eventId/applicants")

    group.Get("/schema", h.GetApplicantSchemaHandler)
    group.Get("/", h.ListApplicantsHandler)
    group.Post("/", h.CreateApplicantHandler)
    group.Post("/bulk", h.BulkCreateApplicantsHandler)
    group.Delete("/:applicantId", h.DeleteApplicantHandler)
}
