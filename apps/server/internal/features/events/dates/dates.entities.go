package dates

import (
    "errors"
    "time"
)

var (
    ErrEventNotFound     = errors.New("event not found")
    ErrDateOutOfRange    = errors.New("one or more dates exceed the event date range")
    ErrInvalidDateFormat = errors.New("invalid date format, expected YYYY-MM-DD")
    ErrInvalidTimeFormat = errors.New("invalid time format, expected HH:MM")
    ErrInvalidTimeOrder  = errors.New("end time must be greater than or equal to start time")
    ErrEmptyDates        = errors.New("dates array cannot be empty")
)

// EventDate represents a single scheduled date for an event.
type EventDate struct {
    ID         string    `json:"id"`
    EventID    string    `json:"event_id"`
    // SubEventID is set for a sub-event's day.
    SubEventID *string   `json:"sub_event_id"`
    Date       string    `json:"date"`
    StartTime  string    `json:"start_time"`
    EndTime    string    `json:"end_time"`
    CreatedAt  time.Time `json:"created_at"`
    UpdatedAt  time.Time `json:"updated_at"`
}

// EventDateItemInput represents the payload for a single date within bulk operations.
type EventDateItemInput struct {
    Date      string `json:"date" validate:"required,datetime=2006-01-02"`
    StartTime string `json:"start_time" validate:"required,datetime=15:04"`
    EndTime   string `json:"end_time" validate:"required,datetime=15:04,gtecsfield=StartTime"`
}

// BulkUpsertEventDatesRequest represents the payload for overriding event dates.
type BulkUpsertEventDatesRequest struct {
    Dates []EventDateItemInput `json:"dates" validate:"required,min=1,dive"`
}

// SyncEventDatesRequest represents the payload for atomic sync (delete + upsert) in one call.
type SyncEventDatesRequest struct {
    UpsertDates []EventDateItemInput `json:"upsert_dates" validate:"dive"`
    DeleteDates []string             `json:"delete_dates" validate:"dive,datetime=2006-01-02"`
}
