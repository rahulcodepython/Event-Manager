package events

import (
    "context"
    "errors"
    "strings"

    "github.com/jackc/pgx/v5"

    "identitycard-server/internal/generic"
    "identitycard-server/internal/pkg/postgres"
)

type updateEventResult struct {
    Status string `json:"status"`
    Data   *Event `json:"data"`
}

// ListRepository queries the total count and paginated events in a single network round-trip.
func (r *App) ListRepository(ctx context.Context, orgID, search string, page, limit, offset int) (*generic.PaginatedResponse[[]Event], error) {
    result, err := postgres.QueryJSON[generic.PaginatedResponse[[]Event]](ctx, r.DB, ListEventsQuery, search, limit, offset, page, orgID)
    if err != nil {
        return nil, err
    }
    if result == nil {
        return &generic.PaginatedResponse[[]Event]{
            Data:  []Event{},
            Total: 0,
            Page:  page,
            Limit: limit,
        }, nil
    }
    if result.Data == nil {
        result.Data = []Event{}
    }
    return result, nil
}

// GetRepository finds an event by UUID in a single network round-trip.
func (r *App) GetRepository(ctx context.Context, id string) (*Event, error) {
    return postgres.QueryJSON[Event](ctx, r.DB, GetEventQuery, id)
}

// CreateRepository inserts into events and event_metadata in a single CTE network round-trip.
func (r *App) CreateRepository(ctx context.Context, orgID string, req CreateEventRequest) (*Event, error) {
    return postgres.QueryJSON[Event](
        ctx,
        r.DB,
        CreateEventQuery,
        req.StartDate,
        req.EndDate,
        strings.TrimSpace(req.Name),
        orgID,
        req.CreditID,
    )
}

// CheckCreditRepository validates a credit for an event's dates. eventID is
// empty when creating.
func (r *App) CheckCreditRepository(ctx context.Context, creditID, orgID, eventID, start, end string) (*creditCheck, error) {
    var excluded *string
    if eventID != "" {
        excluded = &eventID
    }
    return postgres.QueryJSON[creditCheck](ctx, r.DB, CheckCreditQuery, creditID, orgID, excluded, start, end)
}

// UpdateRepository modifies events and event_metadata in a single CTE network round-trip,
// verifying that the event exists and has not already ended (end_date >= CURRENT_DATE).
func (r *App) UpdateRepository(ctx context.Context, id string, req UpdateEventRequest) (*Event, error) {
    result, err := postgres.QueryJSON[updateEventResult](
        ctx,
        r.DB,
        UpdateEventQuery,
        id,
        req.StartDate,
        req.EndDate,
        req.Name,
        req.Venue,
        req.Logo,
        req.Organizer,
    )
    if err != nil {
        return nil, err
    }
    if result == nil || result.Status == "not_found" {
        return nil, postgres.ErrNotFound
    }
    if result.Status == "event_ended" {
        return nil, ErrEventEnded
    }
    if result.Data == nil {
        return nil, postgres.ErrNotFound
    }
    return result.Data, nil
}

// DeleteRepository removes an event by ID in a single CTE network round-trip.
func (r *App) DeleteRepository(ctx context.Context, id string) error {
    var deletedID string
    err := r.DB.QueryRow(ctx, DeleteEventQuery, id).Scan(&deletedID)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return postgres.ErrNotFound
        }
        return postgres.MapPgError(err)
    }
    return nil
}
