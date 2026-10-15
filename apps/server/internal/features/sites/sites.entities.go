package sites

import "time"

// Site is an event's site as the organizer sees it.
type Site struct {
    // Entitled: the event's credit includes an event website.
    Entitled   bool       `json:"entitled"`
    Slug       *string    `json:"slug"`
    URL        *string    `json:"url"`
    HasFiles   bool       `json:"has_files"`
    FileCount  int        `json:"file_count"`
    TotalBytes int64      `json:"total_bytes"`
    UploadedAt *time.Time `json:"uploaded_at"`
    // Live: served right now (files uploaded, credit active, not suspended).
    Live bool `json:"live"`
}

type siteRow struct {
    Entitled   bool       `json:"entitled"`
    Active     bool       `json:"active"`
    Slug       *string    `json:"slug"`
    Version    *string    `json:"version"`
    FileCount  int        `json:"file_count"`
    TotalBytes int64      `json:"total_bytes"`
    UploadedAt *time.Time `json:"uploaded_at"`
}

type ClaimRequest struct {
    Slug string `json:"slug"`
}

type CheckResponse struct {
    Slug      string `json:"slug"`
    Available bool   `json:"available"`
    Reason    string `json:"reason,omitempty"`
}
