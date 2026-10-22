package events

import (
    "context"
    "errors"
    "fmt"
    "strings"
    "time"

    "github.com/google/uuid"

    "identitycard-server/internal/generic"
    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrInvalidEventID    = errors.New("invalid event id")
    ErrInvalidDateFormat = errors.New("date must be in YYYY-MM-DD format")
    ErrInvalidDateRange  = errors.New("end_date must be greater than or equal to start_date")
    ErrEventEnded        = errors.New("cannot update an event that has already ended")
    ErrInvalidTimezone   = errors.New("timezone must be an IANA name such as Asia/Kolkata")
    ErrEventNotFound     = errors.New("event not found")
    ErrCreditNotFound    = errors.New("credit not found")
    ErrCreditExpired     = errors.New("this credit has expired")
    ErrCreditInUse       = errors.New("this credit is already used by another event; delete that event first")
    ErrOutsideCredit     = errors.New("event dates are outside the credit's validity")
    ErrTrialTooLong      = errors.New("event is too long for a trial credit")
)

// checkCredit enforces the credit rules for an event's dates: the credit
// belongs to the organization, has not expired, serves no other event, and
// the dates fit its window (plus the trial length cap).
func (s *App) checkCredit(ctx context.Context, creditID, orgID, eventID, start, end string) error {
    if _, err := uuid.Parse(creditID); err != nil {
        return ErrCreditNotFound
    }
    res, err := s.CheckCreditRepository(ctx, creditID, orgID, eventID, start, end)
    if err != nil {
        return err
    }
    switch res.Status {
    case "ok":
        return nil
    case "not_found":
        return ErrCreditNotFound
    case "expired":
        return ErrCreditExpired
    case "in_use":
        return ErrCreditInUse
    case "outside_window":
        return fmt.Errorf("%w: dates must be between %s and %s", ErrOutsideCredit, res.StartsOn, res.EndsOn)
    case "trial_too_long":
        return fmt.Errorf("%w: at most %d days", ErrTrialTooLong, res.TrialMaxDays)
    }
    return fmt.Errorf("unexpected credit status %q", res.Status)
}

// IsCreditError reports whether err is a credit rule violation (a 400).
func IsCreditError(err error) bool {
    for _, target := range []error{ErrCreditNotFound, ErrCreditExpired, ErrCreditInUse, ErrOutsideCredit, ErrTrialTooLong} {
        if errors.Is(err, target) {
            return true
        }
    }
    return false
}

// ListService retrieves paginated events with TTL jitter caching in a single database round-trip.
func (s *App) ListService(ctx context.Context, orgID, search string, page, limit int) (*generic.PaginatedResponse[[]Event], error) {
    search = strings.TrimSpace(search)
    offset := (page - 1) * limit

    cacheKey := fmt.Sprintf("cache:events:list:o=%s:s=%s:p=%d:l=%d", orgID, search, page, limit)
    return cache.RememberWithJitter(ctx, s.Cache, cacheKey, 3*time.Minute, cache.DefaultJitterPercentage, func() (*generic.PaginatedResponse[[]Event], error) {
        return s.ListRepository(ctx, orgID, search, page, limit, offset)
    })
}

// GetService finds an event by UUID with TTL jitter caching.
func (s *App) GetService(ctx context.Context, id string) (*Event, error) {
    if _, err := uuid.Parse(id); err != nil {
        return nil, ErrInvalidEventID
    }

    cacheKey := fmt.Sprintf("cache:events:detail:%s", id)
    return cache.RememberWithJitter(ctx, s.Cache, cacheKey, 5*time.Minute, cache.DefaultJitterPercentage, func() (*Event, error) {
        ev, err := s.GetRepository(ctx, id)
        if err != nil {
            if errors.Is(err, postgres.ErrNotFound) {
                return nil, ErrEventNotFound
            }
            return nil, err
        }
        return ev, nil
    })
}

// CreateService validates inputs and creates an event, invalidating events list cache.
func (s *App) CreateService(ctx context.Context, orgID string, req CreateEventRequest) (*Event, error) {
    start, err := time.Parse("2006-01-02", req.StartDate)
    if err != nil {
        return nil, ErrInvalidDateFormat
    }
    end, err := time.Parse("2006-01-02", req.EndDate)
    if err != nil {
        return nil, ErrInvalidDateFormat
    }
    if end.Before(start) {
        return nil, ErrInvalidDateRange
    }
    if req.Timezone == "" {
        req.Timezone = s.DefaultTimezone
    }
    if !validTimezone(req.Timezone) {
        return nil, ErrInvalidTimezone
    }
    if err := s.checkCredit(ctx, req.CreditID, orgID, "", req.StartDate, req.EndDate); err != nil {
        return nil, err
    }

    ev, err := s.CreateRepository(ctx, orgID, req)
    if errors.Is(err, postgres.ErrConflict) {
        return nil, ErrCreditInUse // lost a race for the same credit
    }
    if err != nil {
        return nil, err
    }

    if s.Cache != nil {
        _ = s.Cache.DeletePattern(ctx, fmt.Sprintf("cache:events:list:o=%s:*", orgID))
    }

    return ev, nil
}

// UpdateService validates inputs and delegates atomic check-and-update to repository.
func (s *App) UpdateService(ctx context.Context, orgID, id string, req UpdateEventRequest) (*Event, error) {
    if _, err := uuid.Parse(id); err != nil {
        return nil, ErrInvalidEventID
    }

    var start, end time.Time
    var err error

    if req.StartDate != nil {
        start, err = time.Parse("2006-01-02", *req.StartDate)
        if err != nil {
            return nil, ErrInvalidDateFormat
        }
    }

    if req.EndDate != nil {
        end, err = time.Parse("2006-01-02", *req.EndDate)
        if err != nil {
            return nil, ErrInvalidDateFormat
        }
    }

    if req.StartDate != nil && req.EndDate != nil && end.Before(start) {
        return nil, ErrInvalidDateRange
    }

    if req.Timezone != nil && !validTimezone(*req.Timezone) {
        return nil, ErrInvalidTimezone
    }

    if req.StartDate != nil || req.EndDate != nil {
        current, err := s.GetRepository(ctx, id)
        if err != nil {
            if errors.Is(err, postgres.ErrNotFound) {
                return nil, ErrEventNotFound
            }
            return nil, err
        }
        newStart, newEnd := current.StartDate, current.EndDate
        if req.StartDate != nil {
            newStart = *req.StartDate
        }
        if req.EndDate != nil {
            newEnd = *req.EndDate
        }
        if newEnd < newStart {
            return nil, ErrInvalidDateRange
        }
        if current.Credit != nil {
            if err := s.checkCredit(ctx, current.Credit.ID, orgID, id, newStart, newEnd); err != nil {
                return nil, err
            }
        }
    }

    ev, err := s.UpdateRepository(ctx, id, req)
    if err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            return nil, ErrEventNotFound
        }
        return nil, err
    }

    if s.Cache != nil {
        _ = s.Cache.Delete(ctx, fmt.Sprintf("cache:events:detail:%s", id))
        _ = s.Cache.DeletePattern(ctx, "cache:events:list:*")
    }

    return ev, nil
}

// DeleteService removes an event by UUID and purges event cache.
func (s *App) DeleteService(ctx context.Context, id string) error {
    if _, err := uuid.Parse(id); err != nil {
        return ErrInvalidEventID
    }

    err := s.DeleteRepository(ctx, id)
    if err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            return ErrEventNotFound
        }
        return err
    }

    if s.Cache != nil {
        _ = s.Cache.Delete(ctx, fmt.Sprintf("cache:events:detail:%s", id))
        _ = s.Cache.DeletePattern(ctx, "cache:events:*")
    }
    for _, hook := range s.OnDelete {
        hook(ctx, id)
    }

    return nil
}

// validTimezone accepts IANA names only ("Local" and "" are not event zones).
func validTimezone(tz string) bool {
    if tz == "" || tz == "Local" {
        return false
    }
    _, err := time.LoadLocation(tz)
    return err == nil
}
