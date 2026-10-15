package auth

import "github.com/gofiber/fiber/v2"

// RegisterPublicRoutes mounts the routes that run before a session exists.
func (h *App) RegisterPublicRoutes(r fiber.Router) {
    group := r.Group("/auth")
    group.Get("/google", h.GoogleRedirectHandler)
    group.Get("/google/callback", h.GoogleCallbackHandler)
    group.Post("/logout", h.LogoutHandler)
}

// RegisterRoutes mounts routes that need a session but not an organization.
func (h *App) RegisterRoutes(r fiber.Router) {
    group := r.Group("/auth")
    group.Get("/me", h.MeHandler)
    group.Post("/onboarding", h.OnboardingHandler)
}
