package sites

import (
    "errors"
    "io"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/pkg/storage"
    "identitycard-server/internal/utils"
)

func (h *App) GetHandler(c *fiber.Ctx) error {
    res, err := h.GetService(c.UserContext(), c.Params("eventId"))
    if err != nil {
        return siteError(c, err)
    }
    return utils.OK(c, "site retrieved", res)
}

func (h *App) CheckHandler(c *fiber.Ctx) error {
    res, err := h.CheckService(c.UserContext(), c.Params("eventId"), c.Query("slug"))
    if err != nil {
        return siteError(c, err)
    }
    return utils.OK(c, "subdomain checked", res)
}

func (h *App) ClaimHandler(c *fiber.Ctx) error {
    var req ClaimRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    res, err := h.ClaimService(c.UserContext(), c.Params("eventId"), req)
    if err != nil {
        return siteError(c, err)
    }
    return utils.OK(c, "subdomain saved", res)
}

func (h *App) UploadHandler(c *fiber.Ctx) error {
    fh, err := c.FormFile("file")
    if err != nil {
        return utils.ErrBadRequest(c, "attach the site as a zip file in the 'file' field", err)
    }
    if fh.Size > maxZipBytes {
        return utils.ErrBadRequest(c, invalidSite("the zip is larger than %d MB", maxZipBytes>>20).Error(), nil)
    }
    f, err := fh.Open()
    if err != nil {
        return utils.ErrBadRequest(c, "cannot read the upload", err)
    }
    defer f.Close()
    data, err := io.ReadAll(io.LimitReader(f, maxZipBytes+1))
    if err != nil {
        return utils.ErrBadRequest(c, "cannot read the upload", err)
    }

    res, err := h.UploadService(c.UserContext(), c.Params("eventId"), data)
    if err != nil {
        return siteError(c, err)
    }
    return utils.OK(c, "site uploaded", res)
}

func (h *App) DeleteHandler(c *fiber.Ctx) error {
    if err := h.DeleteService(c.UserContext(), c.Params("eventId")); err != nil {
        return siteError(c, err)
    }
    return utils.OKEmpty(c, "site deleted")
}

func siteError(c *fiber.Ctx, err error) error {
    switch {
    case errors.Is(err, ErrInvalidSite), errors.Is(err, ErrSlugInvalid), errors.Is(err, ErrNoSlug):
        return utils.ErrBadRequest(c, err.Error(), err)
    case errors.Is(err, ErrNotEntitled):
        return utils.ErrForbidden(c, err.Error(), err)
    case errors.Is(err, ErrSlugTaken):
        return utils.ErrConflict(c, err.Error(), err)
    case errors.Is(err, ErrNoSite):
        return utils.ErrNotFound(c, err.Error(), err)
    case errors.Is(err, storage.ErrNotConfigured):
        return utils.Respond(c, fiber.StatusServiceUnavailable, false, err.Error(), any(nil), err)
    }
    return utils.ErrInternal(c, "site request failed", err)
}
