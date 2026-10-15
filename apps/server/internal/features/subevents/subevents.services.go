package subevents

import (
    "context"
    "errors"
    "fmt"
    "strings"

    "identitycard-server/internal/pkg/entitlements"
)

var (
    ErrInvalid        = errors.New("invalid sub-event")
    ErrLimitReached   = errors.New("sub-event limit reached")
    ErrNoSubEvents    = errors.New("this event's credit does not include sub-events")
    ErrCapBelowCount  = errors.New("capacity is below the number already enrolled")
    ErrNoForm         = errors.New("create the registration form first")
    ErrInvalidSetting = errors.New("mode must be off, one or many")
    ErrNotEnrolled    = errors.New("applicant is not enrolled in this sub-event")
)

func limitError(limit int) error {
    if limit == 0 {
        return ErrNoSubEvents
    }
    return fmt.Errorf("%w: this event's credit allows %d", ErrLimitReached, limit)
}

func (s *App) OverviewService(ctx context.Context, eventID string) (*Overview, error) {
    return s.OverviewRepository(ctx, eventID)
}

func normalize(req *SubEventRequest) error {
    req.Name = strings.TrimSpace(req.Name)
    req.Description = strings.TrimSpace(req.Description)
    req.Venue = strings.TrimSpace(req.Venue)
    if req.Name == "" {
        return fmt.Errorf("%w: name is required", ErrInvalid)
    }
    if req.Capacity != nil && *req.Capacity < 1 {
        return fmt.Errorf("%w: capacity must be at least 1, or empty for no cap", ErrInvalid)
    }
    return nil
}

func (s *App) CreateService(ctx context.Context, eventID string, req SubEventRequest) (*SubEvent, error) {
    if err := normalize(&req); err != nil {
        return nil, err
    }
    id, err := s.CreateRepository(ctx, eventID, req)
    if err != nil {
        return nil, err
    }
    s.invalidate(ctx)
    return s.GetRepository(ctx, id)
}

func (s *App) UpdateService(ctx context.Context, id string, req SubEventRequest) (*SubEvent, error) {
    if err := normalize(&req); err != nil {
        return nil, err
    }
    if req.Capacity != nil {
        n, err := s.EnrolledCountRepository(ctx, id)
        if err != nil {
            return nil, err
        }
        if *req.Capacity < n {
            return nil, fmt.Errorf("%w (%d)", ErrCapBelowCount, n)
        }
    }
    if err := s.UpdateRepository(ctx, id, req); err != nil {
        return nil, err
    }
    s.invalidate(ctx)
    return s.GetRepository(ctx, id)
}

// DeleteService removes a sub-event with its days, enrollments and
// attendance. Enrollments are frozen once applications close, so is this.
func (s *App) DeleteService(ctx context.Context, eventID, id string) error {
    if err := entitlements.RequireApplicationsOpen(ctx, s.DB, eventID); err != nil {
        return err
    }
    if err := s.DeleteRepository(ctx, id); err != nil {
        return err
    }
    s.invalidate(ctx)
    return nil
}

// SettingsService sets how applicants choose sub-events on the public form.
func (s *App) SettingsService(ctx context.Context, eventID string, req SettingsRequest) (*Overview, error) {
    switch req.Mode {
    case "off", "one", "many":
    default:
        return nil, ErrInvalidSetting
    }
    if req.Mode == "off" {
        req.Required = false
    }
    if err := entitlements.RequireApplicationsOpen(ctx, s.DB, eventID); err != nil {
        return nil, err
    }
    ok, err := s.UpdateSettingsRepository(ctx, eventID, req)
    if err != nil {
        return nil, err
    }
    if !ok {
        return nil, ErrNoForm
    }
    s.invalidate(ctx)
    return s.OverviewRepository(ctx, eventID)
}

func (s *App) ListEnrolledService(ctx context.Context, id, search string, page, limit int) (*EnrolledList, error) {
    res, err := s.ListEnrolledRepository(ctx, id, strings.TrimSpace(search), page, limit)
    if err != nil {
        return nil, err
    }
    res.Page, res.Limit = page, limit
    return res, nil
}

// AssignService enrolls applicants chosen by the organizer, each on its own
// so one full or unknown applicant does not block the rest.
func (s *App) AssignService(ctx context.Context, eventID, id string, req AssignRequest) (*AssignResponse, error) {
    if len(req.ApplicantIDs) == 0 || len(req.ApplicantIDs) > 500 {
        return nil, fmt.Errorf("%w: send 1 to 500 applicant ids", ErrInvalid)
    }
    if err := entitlements.RequireApplicationsOpen(ctx, s.DB, eventID); err != nil {
        return nil, err
    }
    res := &AssignResponse{Failed: []AssignError{}}
    for _, applicantID := range dedupe(req.ApplicantIDs) {
        if err := s.EnrollRepository(ctx, eventID, applicantID, []string{id}); err != nil {
            if !IsEnrollError(err) {
                return nil, err
            }
            res.Failed = append(res.Failed, AssignError{ApplicantID: applicantID, Error: err.Error()})
            continue
        }
        res.Added++
    }
    s.invalidate(ctx)
    return res, nil
}

func (s *App) UnassignService(ctx context.Context, eventID, id, applicantID string) error {
    if err := entitlements.RequireApplicationsOpen(ctx, s.DB, eventID); err != nil {
        return err
    }
    ok, err := s.UnenrollRepository(ctx, id, applicantID)
    if err != nil {
        return err
    }
    if !ok {
        return ErrNotEnrolled
    }
    s.invalidate(ctx)
    return nil
}

// IsEnrollError reports whether err is a rule failure of EnrollTx (shown to
// the user) rather than an internal error.
func IsEnrollError(err error) bool {
    for _, target := range []error{ErrSubEventNotFound, ErrNotRegistered, ErrSubEventFull, ErrOnlyOne, ErrSelectionRequired, ErrNotSelectable} {
        if errors.Is(err, target) {
            return true
        }
    }
    return false
}

// invalidate drops cached public form data, which lists sub-events.
func (s *App) invalidate(ctx context.Context) {
    if s.Cache != nil {
        _ = s.Cache.DeletePattern(ctx, "cache:public_apply:*")
        _ = s.Cache.DeletePattern(ctx, "cache:attendance:metrics:*")
    }
}

