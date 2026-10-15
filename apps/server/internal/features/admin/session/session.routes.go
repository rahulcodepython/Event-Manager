package session

import "github.com/gofiber/fiber/v2"

// RegisterPublicRoutes mounts the routes that run before a session exists.
func (h *App) RegisterPublicRoutes(r fiber.Router) {
    group := r.Group("/auth")
    group.Post("/login", h.LoginHandler)
    group.Post("/logout", h.LogoutHandler)
}

func (h *App) RegisterRoutes(r fiber.Router) {
    r.Get("/auth/me", h.MeHandler)
}
