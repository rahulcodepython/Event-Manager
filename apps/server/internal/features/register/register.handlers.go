package register

import (
    "errors"

    "github.com/gofiber/fiber/v2"
    "identitycard-server/internal/utils"
)

func (h *App) GetPublicApplyConfigHandler(c *fiber.Ctx) error {
    eventFormID := c.Params("eventFormId")

    res, err := h.GetPublicApplyConfigService(c.UserContext(), eventFormID)
    if err != nil {
        if errors.Is(err, ErrInvalidEventFormID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrFormNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to get public form details", err)
    }

    return utils.OK(c, "public form details retrieved successfully", res)
}

