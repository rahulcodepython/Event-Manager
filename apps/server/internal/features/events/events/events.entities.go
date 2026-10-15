package events

import (
    "time"
)

// Event represents an event record with display metadata.
type Event struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    StartDate string    `json:"start_date"`
    EndDate   string    `json:"end_date"`
    Venue     *string   `json:"venue,omitempty"`
    Logo      *string   `json:"logo,omitempty"`
    Organizer *string   `json:"organizer,omitempty"`
    Credit    *EventCredit `json:"credit"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// EventCredit is the credit an event runs on.
type EventCredit struct {
    ID          string    `json:"id"`
    Name        string    `json:"name"`
    Kind        string    `json:"kind"`
    EndsAt      time.Time `json:"ends_at"`
    IsExpired   bool      `json:"is_expired"`
    PruneAt     time.Time `json:"prune_at"`
    HasBranding bool      `json:"has_branding"`
}

// creditCheck is the result of CheckCreditQuery.
type creditCheck struct {
    Status       string `json:"status"`
    StartsOn     string `json:"starts_on"`
    EndsOn       string `json:"ends_on"`
    TrialMaxDays int    `json:"trial_max_days"`
}

// CreateEventRequest payload for creating a new event.
type CreateEventRequest struct {
    CreditID  string `json:"credit_id" validate:"required"`
    Name      string `json:"name" validate:"required"`
    StartDate string `json:"start_date" validate:"required"`
    EndDate   string `json:"end_date" validate:"required"`
}

// UpdateEventRequest payload for modifying an existing event.
type UpdateEventRequest struct {
    Name      *string `json:"name"`
    StartDate *string `json:"start_date"`
    EndDate   *string `json:"end_date"`
    Venue     *string `json:"venue"`
    Logo      *string `json:"logo"`
    Organizer *string `json:"organizer"`
}
