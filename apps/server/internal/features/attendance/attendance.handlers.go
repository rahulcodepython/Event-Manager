package attendance

import (
    "errors"
    "log/slog"
    "strings"

    "github.com/gofiber/fiber/v2"
    "identitycard-server/internal/utils"
)

func extractDeviceToken(c *fiber.Ctx) string {
    token := c.Cookies("device_token")
    if token == "" {
        authHeader := c.Get("Authorization")
        if strings.HasPrefix(authHeader, "Bearer ") {
            token = strings.TrimPrefix(authHeader, "Bearer ")
        }
    }
    if token == "" {
        token = c.Get("X-Device-Token")
    }
    return strings.TrimSpace(token)
}

func (h *App) ScanApplicantHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")
    token := extractDeviceToken(c)
    if token == "" {
        return utils.ErrUnauthorized(c, "missing device authorization token", errors.New("unauthorized"))
    }

    var req ScanApplicantRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid scan payload", err)
    }

    res, err := h.ScanApplicantService(c.UserContext(), eventID, token, req)
    if err != nil {
        slog.Error("failed to scan applicant", "error", err, "eventId", eventID)
        if errors.Is(err, ErrDeviceUnauthorized) {
            return utils.ErrForbidden(c, err.Error(), err)
        }
        if errors.Is(err, ErrApplicantNotRegistered) || errors.Is(err, ErrEventNotFound) || errors.Is(err, ErrNoEventDates) ||
            errors.Is(err, ErrSubEventNotFound) || errors.Is(err, ErrNotEnrolled) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        if errors.Is(err, ErrInvalidEventID) || errors.Is(err, ErrInvalidApplicantID) ||
            errors.Is(err, ErrInvalidQR) || errors.Is(err, ErrWrongEvent) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to process scan", err)
    }

    return utils.OK(c, "applicant verified successfully", res)
}

func (h *App) MarkEntryHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")
    token := extractDeviceToken(c)
    if token == "" {
        return utils.ErrUnauthorized(c, "missing device authorization token", errors.New("unauthorized"))
    }

    var req MarkEntryRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid entry payload", err)
    }

    res, err := h.MarkEntryService(c.UserContext(), eventID, token, req)
    if err != nil {
        slog.Error("failed to mark entry", "error", err, "eventId", eventID, "applicantId", req.ApplicantID)
        if errors.Is(err, ErrDeviceUnauthorized) {
            return utils.ErrForbidden(c, err.Error(), err)
        }
        if errors.Is(err, ErrAlreadyEntered) {
            return utils.ErrConflict(c, err.Error(), err)
        }
        if errors.Is(err, ErrSessionEnded) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        if errors.Is(err, ErrApplicantNotRegistered) || errors.Is(err, ErrNoEventDates) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        if errors.Is(err, ErrInvalidEventID) || errors.Is(err, ErrInvalidEventDateID) || errors.Is(err, ErrInvalidApplicantID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to mark entry", err)
    }

    return utils.OK(c, "applicant entry recorded successfully", res)
}

func (h *App) MarkExitHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")
    token := extractDeviceToken(c)
    if token == "" {
        return utils.ErrUnauthorized(c, "missing device authorization token", errors.New("unauthorized"))
    }

    var req MarkExitRequest
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid exit payload", err)
    }

    res, err := h.MarkExitService(c.UserContext(), eventID, token, req)
    if err != nil {
        slog.Error("failed to mark exit", "error", err, "eventId", eventID, "applicantId", req.ApplicantID)
        if errors.Is(err, ErrDeviceUnauthorized) {
            return utils.ErrForbidden(c, err.Error(), err)
        }
        if errors.Is(err, ErrAlreadyExited) || errors.Is(err, ErrNotEnteredYet) {
            return utils.ErrConflict(c, err.Error(), err)
        }
        if errors.Is(err, ErrApplicantNotRegistered) {
            return utils.ErrNotFound(c, err.Error(), err)
        }
        if errors.Is(err, ErrInvalidEventID) || errors.Is(err, ErrInvalidEventDateID) || errors.Is(err, ErrInvalidApplicantID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to mark exit", err)
    }

    return utils.OK(c, "applicant exit recorded successfully", res)
}

func (h *App) GetAttendanceMetricsHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")

    var fromDate *string
    if q := c.Query("from_date"); q != "" {
        fromDate = &q
    }

    var toDate *string
    if q := c.Query("to_date"); q != "" {
        toDate = &q
    }

    metrics, err := h.GetAttendanceMetricsService(c.UserContext(), eventID, c.Query("sub_event_id"), fromDate, toDate)
    if err != nil {
        slog.Error("failed to get attendance metrics", "error", err, "eventId", eventID)
        if errors.Is(err, ErrInvalidEventID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to get attendance metrics", err)
    }

    return utils.OK(c, "attendance metrics retrieved successfully", metrics)
}

func (h *App) ListAttendeeAnalysisHandler(c *fiber.Ctx) error {
    eventID := c.Params("eventId")
    page, limit := utils.PaginationParams(c)
    if limit <= 0 || limit > 100 {
        limit = 30
    }
    search := c.Query("search")
    status := c.Query("status", "all")

    var fromDate *string
    if q := c.Query("from_date"); q != "" {
        fromDate = &q
    }

    var toDate *string
    if q := c.Query("to_date"); q != "" {
        toDate = &q
    }

    var selectedDate *string
    if q := c.Query("selected_date", c.Query("date")); q != "" {
        selectedDate = &q
    }

    res, err := h.ListAttendeeAnalysisService(c.UserContext(), eventID, c.Query("sub_event_id"), search, status, fromDate, toDate, selectedDate, page, limit)
    if err != nil {
        slog.Error("failed to list attendee analysis", "error", err, "eventId", eventID)
        if errors.Is(err, ErrInvalidEventID) {
            return utils.ErrBadRequest(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to list attendee analysis", err)
    }

    return utils.OK(c, "attendee analysis retrieved successfully", res)
}

// ListDeviceSubEventsHandler lists the sub-events of every event the device
// is assigned to, so the scanner can switch to a sub-event.
func (h *App) ListDeviceSubEventsHandler(c *fiber.Ctx) error {
    token := extractDeviceToken(c)
    if token == "" {
        return utils.ErrUnauthorized(c, "missing device authorization token", errors.New("unauthorized"))
    }
    res, err := h.ListDeviceSubEventsRepository(c.UserContext(), hashDeviceToken(token))
    if err != nil {
        return utils.ErrInternal(c, "failed to list sub-events", err)
    }
    return utils.OK(c, "sub-events retrieved", res)
}
