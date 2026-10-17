package attendance

import (
    "time"
)

// ScanApplicantRequest carries the scanned QR text, a signed qrsign token.
type ScanApplicantRequest struct {
    QR string `json:"qr"`
    // SubEventID scans for a sub-event: its days, enrolled applicants only.
    SubEventID string `json:"sub_event_id,omitempty"`
}

type ScanSubEventInfo struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Venue string `json:"venue"`
}

type ScanApplicantInfo struct {
    UserID       string                 `json:"user_id"`
    Name         string                 `json:"name"`
    Email        string                 `json:"email"`
    Phone        string                 `json:"phone"`
    Data         map[string]interface{} `json:"data"`
    RegisteredAt time.Time              `json:"registered_at"`
    // PhotoKey is read from the database; Photo is what the scanner gets:
    // the applicant's photo as a data URL, so the operator can match faces.
    PhotoKey *string `json:"photo_key,omitempty"`
    Photo    string  `json:"photo,omitempty"`
}

type ScanEventInfo struct {
    ID        string `json:"id"`
    Name      string `json:"name"`
    StartDate string `json:"start_date"`
    EndDate   string `json:"end_date"`
    Venue     string `json:"venue"`
}

type ScanEventDateInfo struct {
    ID        string `json:"id"`
    Date      string `json:"date"`
    StartTime string `json:"start_time"`
    EndTime   string `json:"end_time"`
}

type ScanDeviceInfo struct {
    ID         string `json:"id"`
    Name       string `json:"name"`
    ActualName string `json:"actual_name"`
}

type ScanAttendanceInfo struct {
    ID        *string    `json:"id"`
    Status    string     `json:"status"` // "ready_for_entry", "ready_for_exit", "already_exited"
    EnteredAt *time.Time `json:"entered_at"`
    ExitedAt  *time.Time `json:"exited_at"`
    IsEarly   *bool      `json:"is_early"`
}

type ScanApplicantResponse struct {
    Applicant  ScanApplicantInfo  `json:"applicant"`
    Event      ScanEventInfo      `json:"event"`
    SubEvent   *ScanSubEventInfo  `json:"sub_event"`
    EventDate  ScanEventDateInfo  `json:"event_date"`
    Device     ScanDeviceInfo     `json:"device"`
    Attendance ScanAttendanceInfo `json:"attendance"`
}

type MarkEntryRequest struct {
    ApplicantID string `json:"applicant_id"`
    EventDateID string `json:"event_date_id"`
}

type MarkExitRequest struct {
    ApplicantID string `json:"applicant_id"`
    EventDateID string `json:"event_date_id"`
}

type MarkAttendanceResponse struct {
    ID          string     `json:"id"`
    EventID     string     `json:"event_id"`
    EventDateID string     `json:"event_date_id"`
    ApplicantID string     `json:"applicant_id"`
    Status      string     `json:"status"` // "inside", "already_exited"
    EnteredAt   time.Time  `json:"entered_at"`
    ExitedAt    *time.Time `json:"exited_at"`
    IsEarly     bool       `json:"is_early"`
    Message     string     `json:"message"`
}

// Analysis Models
type AttendanceOverview struct {
    TotalApplicants      int     `json:"total_applicants"`
    TotalAttended        int     `json:"total_attended"`
    TotalNotAttended     int     `json:"total_not_attended"`
    AttendancePercentage float64 `json:"attendance_percentage"`
}

type AttendanceByDate struct {
    Date           string `json:"date"`
    AttendeesCount int    `json:"attendees_count"`
}

type AttendancePunctuality struct {
    EarlyCount int `json:"early_count"`
    LateCount  int `json:"late_count"`
}

type AttendanceMetricsResponse struct {
    Overview    AttendanceOverview    `json:"overview"`
    ByDate      []AttendanceByDate    `json:"by_date"`
    Punctuality AttendancePunctuality `json:"punctuality"`
}

type AttendeeAnalysisItem struct {
    ApplicantID string     `json:"applicant_id"`
    Name        string     `json:"name"`
    Email       string     `json:"email"`
    Phone       string     `json:"phone"`
    Status      string     `json:"status"` // "attended", "inside", "not_attended"
    EventDateID *string    `json:"event_date_id"`
    Date        *string    `json:"date"`
    StartTime   *string    `json:"start_time"`
    EndTime     *string    `json:"end_time"`
    EnteredAt   *time.Time `json:"entered_at"`
    ExitedAt    *time.Time `json:"exited_at"`
    IsEarly     *bool      `json:"is_early"`
    DeviceName  *string    `json:"device_name"`
}

type PaginatedAttendeeAnalysis struct {
    Data  []AttendeeAnalysisItem `json:"data"`
    Total int                    `json:"total"`
    Page  int                    `json:"page"`
    Limit int                    `json:"limit"`
}

// DeviceEventSubEvents is one event of a scanner device with its sub-events.
type DeviceEventSubEvents struct {
    EventID   string `json:"event_id"`
    EventName string `json:"event_name"`
    SubEvents []struct {
        ID    string   `json:"id"`
        Name  string   `json:"name"`
        Venue string   `json:"venue"`
        Dates []string `json:"dates"`
    } `json:"sub_events"`
}
