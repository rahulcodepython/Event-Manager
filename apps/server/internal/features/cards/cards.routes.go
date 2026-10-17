package cards

import "github.com/gofiber/fiber/v2"

func (h *App) RegisterRoutes(r fiber.Router) {
    group := r.Group("/events/:eventId/cards")
    group.Get("/", h.StatusHandler)
    group.Put("/schedule", h.ScheduleHandler)
    group.Post("/close", h.CloseNowHandler)
    group.Post("/publish", h.PublishNowHandler)
    group.Post("/resend", h.ResendHandler)

    applicant := r.Group("/events/:eventId/applicants/:applicantId")
    applicant.Get("/card", h.CardPDFHandler)
    applicant.Get("/qr", h.QRHandler)
    applicant.Post("/card/resend", h.ResendOneHandler)
}
