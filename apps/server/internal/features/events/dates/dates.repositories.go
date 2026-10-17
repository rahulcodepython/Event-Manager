package dates

import (
    "context"
    "encoding/json"

    "identitycard-server/internal/pkg/postgres"
)

type bulkUpsertResult struct {
    Status string      `json:"status"`
    Data   []EventDate `json:"data"`
}

// ListByMonthRepository retrieves all event dates for an event within a specific month.
func (r *App) ListByMonthRepository(ctx context.Context, eventID, subEventID, month string) ([]EventDate, error) {
    return postgres.QueryJSONSlice[EventDate](ctx, r.DB, ListEventDatesByMonthQuery, eventID, month, subEventID)
}

// OverrideRepository removes all existing dates for an event and inserts the new dates in a single database round-trip.
func (r *App) OverrideRepository(ctx context.Context, eventID, subEventID string, dates []EventDateItemInput) ([]EventDate, error) {
    datesJSON, err := json.Marshal(dates)
    if err != nil {
        return nil, err
    }

    result, err := postgres.QueryJSON[bulkUpsertResult](ctx, r.DB, OverrideEventDatesAtomicQuery, eventID, string(datesJSON), subEventID)
    if err != nil {
        return nil, err
    }
    if result == nil || result.Status == "not_found" {
        return nil, ErrEventNotFound
    }
    if result.Status == "date_out_of_range" {
        return nil, ErrDateOutOfRange
    }

    if result.Data == nil {
        return []EventDate{}, nil
    }
    return result.Data, nil
}

// SyncRepository atomically removes deselected dates and upserts active dates in a single database round-trip.
func (r *App) SyncRepository(ctx context.Context, eventID, subEventID string, upsertDates []EventDateItemInput, deleteDates []string) ([]EventDate, error) {
    if upsertDates == nil {
        upsertDates = []EventDateItemInput{}
    }
    if deleteDates == nil {
        deleteDates = []string{}
    }

    datesJSON, err := json.Marshal(upsertDates)
    if err != nil {
        return nil, err
    }

    result, err := postgres.QueryJSON[bulkUpsertResult](ctx, r.DB, SyncEventDatesAtomicQuery, eventID, string(datesJSON), deleteDates, subEventID)
    if err != nil {
        return nil, err
    }
    if result == nil || result.Status == "not_found" {
        return nil, ErrEventNotFound
    }
    if result.Status == "date_out_of_range" {
        return nil, ErrDateOutOfRange
    }

    if result.Data == nil {
        return []EventDate{}, nil
    }
    return result.Data, nil
}
