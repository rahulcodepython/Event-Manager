package subevents

import "time"

type Day struct {
    Date      string `json:"date"`
    StartTime string `json:"start_time"`
    EndTime   string `json:"end_time"`
}

type SubEvent struct {
    ID          string    `json:"id"`
    EventID     string    `json:"event_id"`
    Name        string    `json:"name"`
    Description string    `json:"description"`
    Venue       string    `json:"venue"`
    Capacity    *int      `json:"capacity"`
    LinkEnabled bool      `json:"link_enabled"`
    Enrolled    int       `json:"enrolled"`
    Days        []Day     `json:"days"`
    CreatedAt   time.Time `json:"created_at"`
}

// Settings: how applicants choose sub-events on the public form.
// Mode: off, one or many. Stored on the event form.
type Settings struct {
    HasForm  bool   `json:"has_form"`
    Mode     string `json:"mode"`
    Required bool   `json:"required"`
}

type Overview struct {
    Settings  Settings   `json:"settings"`
    Limit     int        `json:"limit"` // sub-events the credit allows
    SubEvents []SubEvent `json:"sub_events"`
}

type SubEventRequest struct {
    Name        string `json:"name"`
    Description string `json:"description"`
    Venue       string `json:"venue"`
    Capacity    *int   `json:"capacity"`
    LinkEnabled bool   `json:"link_enabled"`
}

type SettingsRequest struct {
    Mode     string `json:"mode"`
    Required bool   `json:"required"`
}

type EnrolledApplicant struct {
    UserID     string    `json:"user_id"`
    Name       string    `json:"name"`
    Email      string    `json:"email"`
    Phone      string    `json:"phone"`
    EnrolledAt time.Time `json:"enrolled_at"`
}

type EnrolledList struct {
    Data  []EnrolledApplicant `json:"data"`
    Total int                 `json:"total"`
    Page  int                 `json:"page"`
    Limit int                 `json:"limit"`
}

type AssignRequest struct {
    ApplicantIDs []string `json:"applicant_ids"`
}

type AssignError struct {
    ApplicantID string `json:"applicant_id"`
    Error       string `json:"error"`
}

type AssignResponse struct {
    Added  int           `json:"added"`
    Failed []AssignError `json:"failed"`
}

// SelfRules are the public form's rules for an applicant choosing
// sub-events themselves.
type SelfRules struct {
    Mode     string
    Required bool
    // Fixed: joined through a sub-event link; Mode and Required do not
    // limit the choice, only "one" still allows a single sub-event in total.
    Fixed bool
}
