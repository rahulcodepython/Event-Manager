package register

import "time"

type PublicEventInfo struct {
    ID        string  `json:"id"`
    Name      string  `json:"name"`
    StartDate string  `json:"start_date"`
    EndDate   string  `json:"end_date"`
    Venue     *string `json:"venue,omitempty"`
    Logo      *string `json:"logo,omitempty"`
    Organizer *string `json:"organizer,omitempty"`
}

type PublicFormInfo struct {
    ID     string        `json:"id"`
    Name   string        `json:"name"`
    Fields []interface{} `json:"fields"`
}

type PublicApplyConfigResponse struct {
    EventFormID       string           `json:"event_form_id"`
    Status            string           `json:"status"` // "waiting" | "live"
    IsExpired         bool             `json:"is_expired"`
    IsFull            bool             `json:"is_full"`
    MaxApplicants     int              `json:"max_applicants"`
    CurrentApplicants int              `json:"current_applicants"`
    Branding          bool             `json:"branding"`
    SubEvents         PublicSubEvents  `json:"sub_events"`
    ExpiresAt         time.Time        `json:"expires_at"`
    Event             *PublicEventInfo `json:"event"`
    Form              *PublicFormInfo  `json:"form"`
}

type SubmitApplicationRequest struct {
    Name  string                 `json:"name" validate:"required"`
    Email string                 `json:"email" validate:"required,email"`
    Phone string                 `json:"phone"`
    Data  map[string]interface{} `json:"data"`
    // SubEventIDs: sub-events chosen on the form.
    SubEventIDs []string `json:"sub_event_ids"`
    // SubEventLink: the sub-event of the link the form was opened with. An
    // email already registered for the event is then enrolled, not refused.
    SubEventLink string `json:"sub_event_link"`
}

// PublicSubEvents: how the form offers sub-events. Mode: off, one, many.
type PublicSubEvents struct {
    Mode     string                 `json:"mode"`
    Required bool                   `json:"required"`
    Options  []PublicSubEventOption `json:"options"`
}

type PublicSubEventOption struct {
    ID          string `json:"id"`
    Name        string `json:"name"`
    Description string `json:"description"`
    Venue       string `json:"venue"`
    LinkEnabled bool   `json:"link_enabled"`
    IsFull      bool   `json:"is_full"`
    Days        []struct {
        Date      string `json:"date"`
        StartTime string `json:"start_time"`
        EndTime   string `json:"end_time"`
    } `json:"days"`
}

type SubmitApplicationResponse struct {
    UserID    string `json:"user_id"`
    Status    string `json:"status"`
    Message   string `json:"message"`
    CreatedAt string `json:"created_at"`
}
