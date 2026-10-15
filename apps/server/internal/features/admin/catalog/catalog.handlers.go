package catalog

import (
    "errors"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/utils"
)

func (h *App) GetCatalogHandler(c *fiber.Ctx) error {
    res, err := h.GetCatalogService(c.UserContext())
    if err != nil {
        return utils.ErrInternal(c, "failed to load catalog", err)
    }
    return utils.OK(c, "catalog retrieved", res)
}

func (h *App) UpdateSettingsHandler(c *fiber.Ctx) error {
    var req UpdateSettingsRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    res, err := h.UpdateSettingsService(c.UserContext(), req)
    if err != nil {
        if errors.Is(err, ErrInvalidCatalog) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to save settings", err)
    }
    return utils.OK(c, "settings saved", res)
}

func (h *App) UpdateFeatureHandler(c *fiber.Ctx) error {
    var req UpdateFeatureRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    res, err := h.UpdateFeatureService(c.UserContext(), c.Params("featureId"), req)
    if err != nil {
        switch {
        case errors.Is(err, ErrInvalidCatalog):
            return utils.ErrBadRequest(c, err.Error(), err)
        case errors.Is(err, postgres.ErrNotFound):
            return utils.ErrNotFound(c, "feature not found", err)
        }
        return utils.ErrInternal(c, "failed to save feature", err)
    }
    return utils.OK(c, "feature saved", res)
}
