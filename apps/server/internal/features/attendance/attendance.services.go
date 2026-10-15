package attendance

import (
    "context"
    "errors"
    "fmt"
    "strings"
    "time"

    "github.com/google/uuid"

    "identitycard-server/internal/pkg/cache"
)

var (
    ErrInvalidEventID         = errors.New("invalid event id")
    ErrInvalidEventDateID     = errors.New("invalid event date id")
    ErrInvalidApplicantID     = errors.New("applicant id is required")
    ErrDeviceUnauthorized     = errors.New("device is not authorized or allocated for this event")
    ErrApplicantNotRegistered = errors.New("applicant is not registered for this event")
    ErrNoEventDates           = errors.New("no event dates scheduled for this event")
    ErrEventNotFound          = errors.New("event not found")
    ErrAlreadyEntered         = errors.New("applicant has already checked in for this date")
    ErrNotEnteredYet          = errors.New("applicant has not checked in yet")
    ErrAlreadyExited          = errors.New("applicant has already checked out for this date")
    ErrSessionEnded           = errors.New("cannot check in: event session time has already ended")
    ErrInvalidQR              = errors.New("invalid or forged QR code")
    ErrWrongEvent             = errors.New("this card belongs to a different event")
)

func (s *App) ScanApplicantService(ctx context.Context, eventID string, token string, req ScanApplicantRequest) (*ScanApplicantResponse, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }

    // Only a QR signed by this server is accepted, so cards cannot be forged.
    payload, err := s.Signer.Verify(req.QR)
    if err != nil {
        return nil, ErrInvalidQR
    }
    if payload.EventID != eventID {
        return nil, ErrWrongEvent
    }

    tokenHash := hashDeviceToken(token)

    raw, err := s.ScanApplicantRepository(ctx, eventID, payload.ApplicantID, tokenHash)
    if err != nil {
        return nil, err
    }
    if raw == nil {
        return nil, ErrDeviceUnauthorized
    }

    switch raw.StatusCode {
    case "device_unauthorized":
        return nil, ErrDeviceUnauthorized
    case "event_not_found":
        return nil, ErrEventNotFound
    case "applicant_not_registered":
        return nil, ErrApplicantNotRegistered
    case "no_event_dates":
        return nil, ErrNoEventDates
    case "ok":
        if raw.Applicant == nil || raw.Event == nil || raw.EventDate == nil || raw.Device == nil || raw.Attendance == nil {
            return nil, ErrApplicantNotRegistered
        }
        return &ScanApplicantResponse{
            Applicant:  *raw.Applicant,
            Event:      *raw.Event,
            EventDate:  *raw.EventDate,
            Device:     *raw.Device,
            Attendance: *raw.Attendance,
        }, nil
    default:
        return nil, ErrApplicantNotRegistered
    }
}

func (s *App) MarkEntryService(ctx context.Context, eventID string, token string, req MarkEntryRequest) (*MarkAttendanceResponse, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }
    if _, err := uuid.Parse(req.EventDateID); err != nil {
        return nil, ErrInvalidEventDateID
    }

    req.ApplicantID = strings.TrimSpace(req.ApplicantID)
    if req.ApplicantID == "" {
        return nil, ErrInvalidApplicantID
    }

    tokenHash := hashDeviceToken(token)

    raw, err := s.MarkEntryRepository(ctx, eventID, req.ApplicantID, req.EventDateID, tokenHash)
    if err != nil {
        return nil, err
    }
    if raw == nil {
        return nil, ErrDeviceUnauthorized
    }

    switch raw.StatusCode {
    case "device_unauthorized":
        return nil, ErrDeviceUnauthorized
    case "applicant_not_registered":
        return nil, ErrApplicantNotRegistered
    case "event_date_not_found":
        return nil, ErrNoEventDates
    case "session_ended":
        return nil, ErrSessionEnded
    case "already_entered":
        return nil, ErrAlreadyEntered
    case "ok":
        if raw.Attendance == nil {
            return nil, errors.New("failed to record entry")
        }
        if s.Cache != nil {
            _ = s.Cache.DeletePattern(ctx, fmt.Sprintf("cache:attendance:metrics:%s*", eventID))
        }
        return raw.Attendance, nil
    default:
        return nil, errors.New("unexpected entry error")
    }
}

func (s *App) MarkExitService(ctx context.Context, eventID string, token string, req MarkExitRequest) (*MarkAttendanceResponse, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }
    if _, err := uuid.Parse(req.EventDateID); err != nil {
        return nil, ErrInvalidEventDateID
    }

    req.ApplicantID = strings.TrimSpace(req.ApplicantID)
    if req.ApplicantID == "" {
        return nil, ErrInvalidApplicantID
    }

    tokenHash := hashDeviceToken(token)

    raw, err := s.MarkExitRepository(ctx, eventID, req.ApplicantID, req.EventDateID, tokenHash)
    if err != nil {
        return nil, err
    }
    if raw == nil {
        return nil, ErrDeviceUnauthorized
    }

    switch raw.StatusCode {
    case "device_unauthorized":
        return nil, ErrDeviceUnauthorized
    case "applicant_not_registered":
        return nil, ErrApplicantNotRegistered
    case "not_entered_yet":
        return nil, ErrNotEnteredYet
    case "already_exited":
        return nil, ErrAlreadyExited
    case "ok":
        if raw.Attendance == nil {
            return nil, errors.New("failed to record exit")
        }
        if s.Cache != nil {
            _ = s.Cache.DeletePattern(ctx, fmt.Sprintf("cache:attendance:metrics:%s*", eventID))
        }
        return raw.Attendance, nil
    default:
        return nil, errors.New("unexpected exit error")
    }
}

func (s *App) GetAttendanceMetricsService(ctx context.Context, eventID string, fromDate, toDate *string) (*AttendanceMetricsResponse, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }

    fStr, tStr := "", ""
    if fromDate != nil {
        fStr = *fromDate
    }
    if toDate != nil {
        tStr = *toDate
    }
    cacheKey := fmt.Sprintf("cache:attendance:metrics:%s:from=%s:to=%s", eventID, fStr, tStr)
    return cache.RememberWithJitter(ctx, s.Cache, cacheKey, 30*time.Second, cache.DefaultJitterPercentage, func() (*AttendanceMetricsResponse, error) {
        return s.GetAttendanceMetricsRepository(ctx, eventID, fromDate, toDate)
    })
}

func (s *App) ListAttendeeAnalysisService(
    ctx context.Context,
    eventID string,
    search string,
    status string,
    fromDate, toDate, selectedDate *string,
    page, limit int,
) (*PaginatedAttendeeAnalysis, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }

    args := []any{eventID}
    whereClauses := []string{"ea.event_id = $1::uuid"}
    var joinClause string

    if selectedDate != nil && *selectedDate != "" {
        args = append(args, *selectedDate)
        dateIdx := len(args)
        joinClause = fmt.Sprintf("LEFT JOIN event_dates ed ON ed.event_id = ea.event_id AND ed.date = $%d::date LEFT JOIN event_attendance att ON att.event_id = ea.event_id AND att.applicant_id = ea.user_id AND att.event_date_id = ed.id", dateIdx)
        whereClauses = append(whereClauses, "ed.id IS NOT NULL")
    } else {
        joinClause = "LEFT JOIN event_attendance att ON att.event_id = ea.event_id AND att.applicant_id = ea.user_id LEFT JOIN event_dates ed ON ed.id = att.event_date_id"
        if fromDate != nil && *fromDate != "" {
            args = append(args, *fromDate)
            whereClauses = append(whereClauses, fmt.Sprintf("(ed.date IS NULL OR ed.date >= $%d::date)", len(args)))
        }

        if toDate != nil && *toDate != "" {
            args = append(args, *toDate)
            whereClauses = append(whereClauses, fmt.Sprintf("(ed.date IS NULL OR ed.date <= $%d::date)", len(args)))
        }
    }

    search = strings.TrimSpace(search)
    if search != "" {
        args = append(args, search)
        paramIdx := len(args)
        whereClauses = append(whereClauses, fmt.Sprintf("(a.name ILIKE '%%' || $%d || '%%' OR a.email ILIKE '%%' || $%d || '%%' OR a.id ILIKE '%%' || $%d || '%%')", paramIdx, paramIdx, paramIdx))
    }

    status = strings.TrimSpace(strings.ToLower(status))
    if status != "" && status != "all" {
        switch status {
        case "attended":
            whereClauses = append(whereClauses, "att.id IS NOT NULL AND att.exited_at IS NOT NULL")
        case "inside":
            whereClauses = append(whereClauses, "att.id IS NOT NULL AND att.exited_at IS NULL")
        case "not_attended":
            whereClauses = append(whereClauses, "att.id IS NULL")
        }
    }

    offset := (page - 1) * limit
    args = append(args, limit, offset, page, limit)
    limitIdx := len(args) - 3
    offsetIdx := len(args) - 2
    pageIdx := len(args) - 1
    limitIdx2 := len(args)

    whereClauseStr := strings.Join(whereClauses, " AND ")

    return s.QueryAttendeeAnalysisRepository(ctx, joinClause, whereClauseStr, limitIdx, offsetIdx, pageIdx, limitIdx2, args...)
}
