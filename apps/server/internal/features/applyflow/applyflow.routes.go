package applyflow

import "github.com/gofiber/fiber/v2"

// RegisterRoutes mounts the public application flow. Call before the
// register routes so /public/apply/google/callback is not taken for a form id.
func (h *App) RegisterRoutes(r fiber.Router) {
    r.Post("/public/apply/google/callback", h.GoogleCallbackHandler)

    group := r.Group("/public/apply/:eventFormId")
    group.Post("/intent", h.IntentHandler)
    group.Post("/session", h.SignInHandler)
    group.Delete("/session", h.SignOutHandler)
    group.Get("/state", h.StateHandler)
    group.Put("/draft", h.SaveHandler)
    group.Post("/submit", h.SubmitHandler)
    group.Post("/enroll", h.EnrollHandler)
    group.Post("/pay", h.PayHandler)
    group.Post("/pay/back", h.BackHandler)
    group.Post("/pay/verify", h.VerifyHandler)
}
