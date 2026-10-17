package dashboard

import (
    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/utils"
)

func (h *App) GetHandler(c *fiber.Ctx) error {
    res, err := h.GetService(c.UserContext(), c.QueryInt("months", 12))
    if err != nil {
        return utils.ErrInternal(c, "failed to load dashboard", err)
    }
    return utils.OK(c, "dashboard retrieved", res)
}
