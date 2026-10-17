package forms

import (
    "errors"

    "github.com/gofiber/fiber/v2"

    "identitycard-server/internal/generic"
    "identitycard-server/internal/middlewares"
    "identitycard-server/internal/utils"
)

// ListHandler returns paginated form templates.
func (h *App) ListHandler(c *fiber.Ctx) error {
    page, limit := utils.PaginationParams(c)
    if limit <= 0 || limit > 100 {
        limit = 30
    }
    search := c.Query("search")

    res, err := h.ListService(c.UserContext(), middlewares.OrgID(c), search, page, limit)
    if err != nil {
        return utils.ErrInternal(c, "failed to list forms", err)
    }

    return utils.OK(c, "forms retrieved successfully", res)
}

// GetHandler returns a single form by ID.
func (h *App) GetHandler(c *fiber.Ctx) error {
    id := c.Params("id")

    f, err := h.GetService(c.UserContext(), id)
    if err != nil {
        if errors.Is(err, ErrInvalidFormID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrFormNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to get form", err)
    }

    return utils.OK(c, "form retrieved successfully", f)
}

// CreateHandler creates a form accepting only Name.
func (h *App) CreateHandler(c *fiber.Ctx) error {
    req, err := utils.ParseBody[CreateFormRequest](c.Body())
    if err != nil {
        return utils.ErrBadRequest(c, err.Error(), err)
    }

    f, err := h.CreateService(c.UserContext(), middlewares.OrgID(c), *req)
    if err != nil {
        if errors.Is(err, ErrInvalidFormName) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to create form", err)
    }

    return utils.Created(c, "form created successfully", f)
}

// UpdateHandler updates form metadata.
func (h *App) UpdateHandler(c *fiber.Ctx) error {
    id := c.Params("id")

    req, err := utils.ParseBody[UpdateFormRequest](c.Body())
    if err != nil {
        return utils.ErrBadRequest(c, err.Error(), err)
    }

    f, err := h.UpdateService(c.UserContext(), id, *req)
    if err != nil {
        if errors.Is(err, ErrInvalidFormID) || errors.Is(err, ErrInvalidFormName) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrFormNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to update form", err)
    }

    return utils.OK(c, "form updated successfully", f)
}

// UpdateFieldsHandler atomically updates all form fields.
func (h *App) UpdateFieldsHandler(c *fiber.Ctx) error {
    id := c.Params("id")
    req, err := utils.ParseBody[UpdateFormFieldsRequest](c.Body())
    if err != nil {
        return utils.ErrBadRequest(c, err.Error(), err)
    }

    f, err := h.UpdateFieldsService(c.UserContext(), id, *req)
    if err != nil {
        if errors.Is(err, ErrInvalidFormID) || errors.Is(err, ErrInvalidFieldType) || errors.Is(err, ErrMissingMandatoryFields) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrFormNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to update form fields", err)
    }

    return utils.OK(c, "form fields updated successfully", f)
}

// DeleteHandler removes a form by ID.
func (h *App) DeleteHandler(c *fiber.Ctx) error {
    id := c.Params("id")

    err := h.DeleteService(c.UserContext(), id)
    if err != nil {
        if errors.Is(err, ErrInvalidFormID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrFormNotFound) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to delete form", err)
    }

    return utils.OK(c, "form deleted successfully", generic.DeleteResponse{ID: id})
}
