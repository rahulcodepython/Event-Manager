package uploads

import (
    "errors"
    "io"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/pkg/imageproc"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/pkg/storage"
    "identitycard-server/internal/utils"
)

type UploadResponse struct {
    Token string `json:"token"`
}

func (h *App) UploadHandler(c *fiber.Ctx) error {
    if h.Sessions != nil {
        if _, err := h.Sessions.Get(c, c.Params("eventFormId")); err != nil {
            return utils.ErrUnauthorized(c, err.Error(), err)
        }
    }
    fh, err := c.FormFile("file")
    if err != nil {
        return utils.ErrBadRequest(c, "attach the image in the 'file' field", err)
    }
    if fh.Size > imageproc.MaxUploadBytes {
        return utils.ErrBadRequest(c, "the image must be 2 MB or smaller", nil)
    }
    f, err := fh.Open()
    if err != nil {
        return utils.ErrBadRequest(c, "cannot read the upload", err)
    }
    defer f.Close()
    data, err := io.ReadAll(io.LimitReader(f, imageproc.MaxUploadBytes+1))
    if err != nil {
        return utils.ErrBadRequest(c, "cannot read the upload", err)
    }

    token, err := h.UploadService(c.UserContext(), c.IP(), c.Params("eventFormId"), c.Query("field"), data)
    if err != nil {
        switch {
        case errors.Is(err, imageproc.ErrInvalid), errors.Is(err, ErrNoSuchField):
            return utils.ErrBadRequest(c, err.Error(), err)
        case errors.Is(err, ErrFormClosed):
            return utils.ErrForbidden(c, err.Error(), err)
        case errors.Is(err, ErrTooMany):
            return utils.ErrTooManyRequests(c, err.Error(), err)
        case errors.Is(err, storage.ErrNotConfigured):
            return utils.Respond(c, fiber.StatusServiceUnavailable, false, "image uploads are not available right now", any(nil), err)
        }
        return utils.ErrInternal(c, "failed to upload image", err)
    }
    return utils.Created(c, "image uploaded", UploadResponse{Token: token})
}

// FileHandler serves an applicant's image to the organizer.
func (h *App) FileHandler(c *fiber.Ctx) error {
    key, err := h.ApplicantFile(c.UserContext(), c.Params("eventId"), c.Params("applicantId"), c.Params("fieldKey"))
    if err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            return utils.ErrNotFound(c, "file not found", err)
        }
        return utils.ErrInternal(c, "failed to load file", err)
    }
    obj, err := h.Store.Get(c.UserContext(), key)
    if err != nil {
        if errors.Is(err, storage.ErrNotFound) {
            return utils.ErrNotFound(c, "file not found", err)
        }
        return utils.ErrInternal(c, "failed to load file", err)
    }
    defer obj.Body.Close()
    body, err := io.ReadAll(obj.Body)
    if err != nil {
        return utils.ErrInternal(c, "failed to load file", err)
    }
    c.Set(fiber.HeaderContentType, obj.ContentType)
    c.Set(fiber.HeaderCacheControl, "private, max-age=300")
    c.Set("X-Content-Type-Options", "nosniff")
    return c.Send(body)
}

// RegisterPublicRoutes: image uploads for the public form.
func (h *App) RegisterPublicRoutes(r fiber.Router) {
    r.Post("/public/apply/:eventFormId/uploads", h.UploadHandler)
}

// RegisterRoutes: the organizer's view of applicant images.
func (h *App) RegisterRoutes(r fiber.Router) {
    r.Get("/events/:eventId/applicants/:applicantId/files/:fieldKey", h.FileHandler)
}
