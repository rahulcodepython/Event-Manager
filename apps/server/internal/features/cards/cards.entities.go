package cards

import "time"

type Counts struct {
    Pending int `json:"pending"`
    Queued  int `json:"queued"`
    Sent    int `json:"sent"`
    Failed  int `json:"failed"`
}

// Status is an event's card schedule and delivery progress.
type Status struct {
    HasForm     bool       `json:"has_form"`
    ClosesAt    *time.Time `json:"closes_at"`
    PublishAt   *time.Time `json:"publish_at"`
    PublishedAt *time.Time `json:"published_at"`
    IsClosed    bool       `json:"is_closed"`
    Counts      Counts     `json:"counts"`
}

type ScheduleRequest struct {
    ClosesAt  time.Time `json:"closes_at"`
    PublishAt time.Time `json:"publish_at"`
}

// ResendRequest: scope "failed" (failed only) or "all" (every applicant).
type ResendRequest struct {
    Scope string `json:"scope"`
}

type QRResponse struct {
    QR string `json:"qr"`
}

// cardData is what one card and its email need.
type cardData struct {
    EventApplicantID string `json:"event_applicant_id"`
    EventID          string `json:"event_id"`
    ApplicantID      string `json:"applicant_id"`
    Name             string `json:"name"`
    Email            string `json:"email"`
    CardStatus       string `json:"card_status"`
    EventName        string `json:"event_name"`
    StartDate        string `json:"start_date"`
    EndDate          string `json:"end_date"`
    Venue            string `json:"venue"`
    Organizer        string `json:"organizer"`
    Logo             string `json:"logo"`
    Branding         bool   `json:"branding"`
}
