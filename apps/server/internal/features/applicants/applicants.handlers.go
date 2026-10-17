package applicants

import (
    "encoding/json"
    "errors"
    "log/slog"

    "github.com/gofiber/fiber/v2"
    "identitycard-server/internal/pkg/entitlements"
    "identitycard-server/internal/utils"
)

func (h *App) GetApplicantSchemaHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    schema, err := h.GetApplicantSchemaService(c.UserContext(), eventID)
    if err != nil {
        slog.Error("failed to get applicant schema", "error", err, "eventId", eventID)
        if errors.Is(err, ErrInvalidEventID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to get applicant schema", err)
    }

    return utils.OK(c, "applicant schema retrieved successfully", schema)
}

func (h *App) ListApplicantsHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")
    page, limit := utils.PaginationParams(c)
    search := c.Query("search")

    var filters []ApplicantFilter
    filtersParam := c.Query("filters")
    if filtersParam != "" {
        if err := json.Unmarshal([]byte(filtersParam), &filters); err != nil {
            return utils.ErrBadRequest(c, "invalid filters JSON format", err)
        }
    }

    if field := c.Query("field"); field != "" {
        filters = append(filters, ApplicantFilter{
            Field: field,
            Op:    c.Query("op", "eq"),
            Value: c.Query("value", c.Query("val")),
        })
    }

    res, err := h.ListApplicantsService(c.UserContext(), eventID, search, filters, page, limit)
    if err != nil {
        slog.Error("failed to list applicants", "error", err, "eventId", eventID, "filters", filters)
        if errors.Is(err, ErrInvalidEventID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to list applicants", err)
    }

    return utils.OK(c, "applicants retrieved successfully", res)
}

func (h *App) CreateApplicantHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    var req CreateApplicantRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }

    applicant, err := h.CreateApplicantService(c.UserContext(), eventID, req)
    if err != nil {
        slog.Error("failed to create applicant", "error", err, "eventId", eventID)
        if errors.Is(err, ErrInvalidEventID) || errors.Is(err, ErrInvalidName) || errors.Is(err, ErrInvalidEmail) || errors.Is(err, ErrInvalidPhone) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrAlreadyRegistered) {
            return utils.ErrConflict(c, err.Error(), err)
        }
        if errors.Is(err, ErrLimitReached) || errors.Is(err, entitlements.ErrReadOnly) || errors.Is(err, entitlements.ErrApplicationsClosed) {
            return utils.ErrForbidden(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to create applicant", err)
    }

    return utils.Created(c, "applicant created successfully", applicant)
}

func (h *App) BulkCreateApplicantsHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    var req BulkCreateApplicantsRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }

    res, err := h.BulkCreateApplicantsService(c.UserContext(), eventID, req.Applicants)
    if err != nil {
        slog.Error("failed to bulk create applicants", "error", err, "eventId", eventID)
        if errors.Is(err, ErrInvalidEventID) || errors.Is(err, ErrBulkLimit) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, entitlements.ErrApplicationsClosed) {
            return utils.ErrForbidden(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to upload applicants", err)
    }

    return utils.OK(c, "applicants uploaded", res)
}

func (h *App) DeleteApplicantHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")
    applicantID := c.Params("applicantId")

    res, err := h.DeleteApplicantService(c.UserContext(), eventID, applicantID)
    if err != nil {
        slog.Error("failed to delete applicant", "error", err, "eventId", eventID, "applicantId", applicantID)
        if errors.Is(err, ErrInvalidEventID) || errors.Is(err, ErrApplicantNotFound) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, entitlements.ErrApplicationsClosed) {
            return utils.ErrForbidden(c, err.Error(), err)
        }
        if errors.Is(err, ErrApplicantPaid) {
            return utils.ErrConflict(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to delete applicant", err)
    }

    return utils.OK(c, "applicant deleted successfully", res)
}
