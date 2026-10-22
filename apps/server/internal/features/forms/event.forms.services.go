package forms

import (
    "context"
    "errors"
    "fmt"
    "strings"
    "time"

    "github.com/google/uuid"

    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/entitlements"
    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrInvalidEventID             = errors.New("invalid event id")
    ErrEventFormNotFound          = errors.New("event form not found")
    ErrEventFormAlreadyExists     = errors.New("an event form has already been created for this event")
    ErrFormIsLocked               = errors.New("form is locked and cannot be modified")
    ErrCannotDeleteWithApplicants = errors.New("cannot delete form: applicants have already registered")
    ErrInvalidTemplateID          = errors.New("invalid template id")
    ErrInvalidExpiresAt           = errors.New("expiration date must be in the future")
    ErrExpiresAfterEvent          = errors.New("the registration deadline must be on or before the event's last day")
    ErrInvalidMaxApplicants       = errors.New("max applicants must be -1 or at least 1")
    ErrCapacityAboveCredit        = errors.New("form capacity cannot exceed the credit's applicant limit")
    ErrInvalidSource              = errors.New("source must be either 'template' or 'scratch'")
)

func (s *App) GetEventFormService(ctx context.Context, eventID string) (*EventFormDetails, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }

    cacheKey := fmt.Sprintf("cache:event_forms:event:%s", eventID)
    return cache.RememberWithJitter(ctx, s.Cache, cacheKey, 5*time.Minute, cache.DefaultJitterPercentage, func() (*EventFormDetails, error) {
        ef, err := s.GetEventFormRepository(ctx, eventID)
        if err != nil {
            if errors.Is(err, postgres.ErrNotFound) {
                return nil, ErrEventFormNotFound
            }
            return nil, err
        }
        return ef, nil
    })
}

func (s *App) CreateEventFormService(ctx context.Context, eventID string, req CreateEventFormRequest) (*EventFormDetails, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }

    name := strings.TrimSpace(req.Name)
    if name == "" {
        name = "Event Registration Form"
    }

    if req.MaxApplicants != -1 && req.MaxApplicants < 1 {
        return nil, ErrInvalidMaxApplicants
    }
    if err := s.checkCapacity(ctx, eventID, req.MaxApplicants); err != nil {
        return nil, err
    }

    if time.Now().After(req.ExpiresAt) {
        return nil, ErrInvalidExpiresAt
    }
    // The default deadline comes from the browser's clock; keep it within
    // the event's last day in the event's timezone.
    end, err := s.eventEnd(ctx, eventID)
    if err != nil {
        return nil, err
    }
    if req.ExpiresAt.After(end) {
        req.ExpiresAt = end
    }

    var ef *EventFormDetails

    source := strings.ToLower(strings.TrimSpace(req.Source))
    switch source {
    case "template":
        if req.TemplateID == nil || *req.TemplateID == "" {
            return nil, ErrInvalidTemplateID
        }
        if _, err := uuid.Parse(*req.TemplateID); err != nil {
            return nil, ErrInvalidTemplateID
        }
        var err error
        ef, err = s.CreateFromTemplateRepository(ctx, eventID, *req.TemplateID, name, req.MaxApplicants, req.ExpiresAt)
        if err != nil {
            if errors.Is(err, postgres.ErrConflict) {
                return nil, ErrEventFormAlreadyExists
            }
            if errors.Is(err, postgres.ErrNotFound) {
                return nil, ErrInvalidTemplateID
            }
            return nil, err
        }

    case "scratch":
        fieldsBytes := req.Fields
        if len(fieldsBytes) == 0 || string(fieldsBytes) == "null" || string(fieldsBytes) == "[]" {
            fieldsBytes = defaultEventFormFields()
        } else {
            if err := validateEventFieldsJSON(fieldsBytes); err != nil {
                return nil, err
            }
        }
        var err error
        ef, err = s.CreateFromScratchRepository(ctx, eventID, name, fieldsBytes, req.MaxApplicants, req.ExpiresAt)
        if err != nil {
            if errors.Is(err, postgres.ErrConflict) {
                return nil, ErrEventFormAlreadyExists
            }
            return nil, err
        }

    default:
        return nil, ErrInvalidSource
    }

    if s.Cache != nil {
        _ = s.Cache.DeletePattern(ctx, fmt.Sprintf("cache:event_forms:event:%s*", eventID))
        _ = s.Cache.DeletePattern(ctx, "cache:public_apply:*")
    }

    return ef, nil
}

func (s *App) UpdateEventFormService(ctx context.Context, eventID string, req UpdateEventFormRequest) (*EventFormDetails, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }

    if req.MaxApplicants != nil {
        if *req.MaxApplicants != -1 && *req.MaxApplicants < 1 {
            return nil, ErrInvalidMaxApplicants
        }
        if err := s.checkCapacity(ctx, eventID, *req.MaxApplicants); err != nil {
            return nil, err
        }
    }

    if req.ExpiresAt != nil {
        if time.Now().After(*req.ExpiresAt) {
            return nil, ErrInvalidExpiresAt
        }
        end, err := s.eventEnd(ctx, eventID)
        if err != nil {
            return nil, err
        }
        if req.ExpiresAt.After(end) {
            return nil, ErrExpiresAfterEvent
        }
    }

    var fieldsJSON []byte
    if req.Fields != nil {
        fieldsJSON = *req.Fields
        if err := validateEventFieldsJSON(fieldsJSON); err != nil {
            return nil, err
        }
    }

    var trimmedName *string
    if req.Name != nil {
        n := strings.TrimSpace(*req.Name)
        if n == "" {
            return nil, ErrInvalidFormName
        }
        trimmedName = &n
    }

    res, err := s.UpdateEventFormRepository(ctx, eventID, trimmedName, fieldsJSON, req.MaxApplicants, req.ExpiresAt)
    if err != nil {
        return nil, err
    }
    if !res.Exists {
        return nil, ErrEventFormNotFound
    }
    if res.IsLocked {
        return nil, ErrFormIsLocked
    }
    if res.Form == nil {
        return nil, ErrEventFormNotFound
    }

    if s.Cache != nil {
        _ = s.Cache.DeletePattern(ctx, fmt.Sprintf("cache:event_forms:event:%s*", eventID))
        _ = s.Cache.DeletePattern(ctx, "cache:public_apply:*")
    }

    return res.Form, nil
}

func (s *App) LockEventFormService(ctx context.Context, eventID string) (*EventFormDetails, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }

    res, err := s.LockEventFormRepository(ctx, eventID)
    if err != nil {
        return nil, err
    }
    if !res.Exists {
        return nil, ErrEventFormNotFound
    }
    if res.IsExpired {
        return nil, ErrInvalidExpiresAt
    }
    if res.Form == nil {
        return nil, ErrEventFormNotFound
    }

    if s.Cache != nil {
        _ = s.Cache.DeletePattern(ctx, fmt.Sprintf("cache:event_forms:event:%s*", eventID))
        _ = s.Cache.DeletePattern(ctx, "cache:public_apply:*")
    }

    return res.Form, nil
}

func (s *App) DeleteEventFormService(ctx context.Context, eventID string) error {
    if _, err := uuid.Parse(eventID); err != nil {
        return ErrInvalidEventID
    }

    res, err := s.DeleteEventFormRepository(ctx, eventID)
    if err != nil {
        return err
    }
    if !res.Exists {
        return ErrEventFormNotFound
    }
    if !res.Deleted {
        return ErrCannotDeleteWithApplicants
    }

    if s.Cache != nil {
        _ = s.Cache.DeletePattern(ctx, fmt.Sprintf("cache:event_forms:event:%s*", eventID))
        _ = s.Cache.DeletePattern(ctx, "cache:public_apply:*")
    }

    return nil
}

// checkCapacity keeps a form's own capacity within its credit's applicant
// limit; -1 (no form cap) means "up to the credit limit".
func (s *App) checkCapacity(ctx context.Context, eventID string, capacity int) error {
    if capacity == -1 {
        return nil
    }
    ent, err := entitlements.ForEvent(ctx, s.DB, eventID)
    if err != nil {
        return err
    }
    if capacity > ent.ApplicantLimit {
        return fmt.Errorf("%w (%d)", ErrCapacityAboveCredit, ent.ApplicantLimit)
    }
    return nil
}

// eventEnd is the end of the event's last day in its own timezone.
func (s *App) eventEnd(ctx context.Context, eventID string) (time.Time, error) {
    var end time.Time
    err := s.DB.QueryRow(ctx, `
        SELECT (end_date + 1)::timestamp AT TIME ZONE timezone FROM events WHERE id = $1::uuid
    `, eventID).Scan(&end)
    if err != nil {
        return time.Time{}, postgres.MapPgError(err)
    }
    return end, nil
}
