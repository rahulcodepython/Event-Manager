package dates

import (
    "context"
    "fmt"
    "strings"
    "time"

    "identitycard-server/internal/pkg/cache"
)

// ListByMonthService validates parameters and fetches event dates with TTL jitter caching.
func (s *App) ListByMonthService(ctx context.Context, eventID, subEventID, month string) ([]EventDate, error) {
    targetMonth := strings.TrimSpace(month)
    if targetMonth != "" {
        if _, err := time.Parse("2006-01", targetMonth); err != nil {
            return nil, ErrInvalidDateFormat
        }
    }

    cacheKey := fmt.Sprintf("cache:dates:e=%s:s=%s:m=%s", eventID, subEventID, targetMonth)
    return cache.RememberWithJitter(ctx, s.Cache, cacheKey, 5*time.Minute, cache.DefaultJitterPercentage, func() ([]EventDate, error) {
        return s.ListByMonthRepository(ctx, eventID, subEventID, targetMonth)
    })
}

// OverrideService replaces all event dates with the provided batch and purges date cache.
func (s *App) OverrideService(ctx context.Context, eventID, subEventID string, req BulkUpsertEventDatesRequest) ([]EventDate, error) {
    res, err := s.OverrideRepository(ctx, eventID, subEventID, req.Dates)
    if err != nil {
        return nil, err
    }
    if s.Cache != nil {
        _ = s.Cache.DeletePattern(ctx, fmt.Sprintf("cache:dates:e=%s*", eventID))
    }
    return res, nil
}

// SyncService atomically synchronizes event dates (deleting deselected, upserting active) in one DB round-trip and purges date cache.
func (s *App) SyncService(ctx context.Context, eventID, subEventID string, req SyncEventDatesRequest) ([]EventDate, error) {
    res, err := s.SyncRepository(ctx, eventID, subEventID, req.UpsertDates, req.DeleteDates)
    if err != nil {
        return nil, err
    }
    if s.Cache != nil {
        _ = s.Cache.DeletePattern(ctx, fmt.Sprintf("cache:dates:e=%s*", eventID))
    }
    return res, nil
}
