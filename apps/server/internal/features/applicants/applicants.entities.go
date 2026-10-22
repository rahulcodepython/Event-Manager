package applicants

import "time"

type ApplicantItem struct {
    UserID    string                 `json:"user_id"`
    Name      string                 `json:"name"`
    Email     string                 `json:"email"`
    Phone     string                 `json:"phone"`
    Data      map[string]interface{} `json:"data"`
    CreatedAt time.Time              `json:"created_at"`
    // Card delivery: pending, queued, sent or failed (see cards).
    CardStatus string     `json:"card_status,omitempty"`
    CardSentAt *time.Time `json:"card_sent_at,omitempty"`
    CardError  string     `json:"card_error,omitempty"`
    // PaidAmount: application fee paid, in paise (list only; nil = none).
    PaidAmount *int64 `json:"paid_amount,omitempty"`
    // SubEvents the applicant is enrolled in (list only).
    SubEvents []SubEventRef `json:"sub_events,omitempty"`
}

type SubEventRef struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

type ApplicantFilter struct {
    Field string `json:"field"`
    Op    string `json:"op"`
    Value string `json:"value"`
}

type FormFieldItem struct {
    ID          string      `json:"id"`
    Key         string      `json:"key"`
    Label       string      `json:"label"`
    Type        string      `json:"type"`
    Required    bool        `json:"required"`
    Placeholder string      `json:"placeholder,omitempty"`
    Options     interface{} `json:"options,omitempty"`
    IsSystem    bool        `json:"is_system,omitempty"`
    Validation  interface{} `json:"validation,omitempty"`
}

type FormSummary struct {
    ID     string          `json:"id"`
    Name   string          `json:"name"`
    Fields []FormFieldItem `json:"fields"`
}

type ListApplicantsResponse struct {
    Data  []ApplicantItem `json:"data"`
    Total int             `json:"total"`
    Page  int             `json:"page"`
    Limit int             `json:"limit"`
    Form  *FormSummary    `json:"form,omitempty"`
}

type CreateApplicantRequest struct {
    Name  string                 `json:"name"`
    Email string                 `json:"email"`
    Phone string                 `json:"phone"`
    Data  map[string]interface{} `json:"data"`
}

type DeleteApplicantResponse struct {
    UserID  string `json:"user_id"`
    Message string `json:"message"`
}

type BulkCreateApplicantsRequest struct {
    Applicants []CreateApplicantRequest `json:"applicants"`
}

type BulkApplicantError struct {
    Row   int    `json:"row"`
    Email string `json:"email"`
    Error string `json:"error"`
}

type BulkCreateApplicantsResponse struct {
    Created int                  `json:"created"`
    Failed  []BulkApplicantError `json:"failed"`
}
