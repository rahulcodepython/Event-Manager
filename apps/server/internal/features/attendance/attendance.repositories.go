package attendance

import (
    "context"

    "identitycard-server/internal/pkg/postgres"
)

type ScanApplicantRawResponse struct {
    StatusCode string              `json:"status_code"`
    Device     *ScanDeviceInfo     `json:"device"`
    Applicant  *ScanApplicantInfo  `json:"applicant"`
    Event      *ScanEventInfo      `json:"event"`
    SubEvent   *ScanSubEventInfo   `json:"sub_event"`
    EventDate  *ScanEventDateInfo  `json:"event_date"`
    Attendance *ScanAttendanceInfo `json:"attendance"`
}

type MarkAttendanceRawResponse struct {
    StatusCode string                  `json:"status_code"`
    Attendance *MarkAttendanceResponse `json:"attendance"`
}

func (r *App) ScanApplicantRepository(ctx context.Context, eventID, applicantID, tokenHash, subEventID string) (*ScanApplicantRawResponse, error) {
    return postgres.QueryJSON[ScanApplicantRawResponse](ctx, r.DB, ScanApplicantQuery, eventID, applicantID, tokenHash, subEventID)
}

func (r *App) MarkEntryRepository(ctx context.Context, eventID, applicantID, eventDateID, tokenHash string) (*MarkAttendanceRawResponse, error) {
    return postgres.QueryJSON[MarkAttendanceRawResponse](ctx, r.DB, MarkEntryAtomicQuery, eventID, applicantID, eventDateID, tokenHash)
}

func (r *App) MarkExitRepository(ctx context.Context, eventID, applicantID, eventDateID, tokenHash string) (*MarkAttendanceRawResponse, error) {
    return postgres.QueryJSON[MarkAttendanceRawResponse](ctx, r.DB, MarkExitAtomicQuery, eventID, applicantID, eventDateID, tokenHash)
}

func (r *App) GetAttendanceMetricsRepository(ctx context.Context, eventID, subEventID string, fromDate, toDate *string) (*AttendanceMetricsResponse, error) {
    return postgres.QueryJSON[AttendanceMetricsResponse](ctx, r.DB, GetAttendanceMetricsQuery, eventID, fromDate, toDate, subEventID)
}

func (r *App) QueryAttendeeAnalysisRepository(ctx context.Context, joinClause, whereClause string, limitIdx, offsetIdx, pageIdx, limitIdx2 int, args ...any) (*PaginatedAttendeeAnalysis, error) {
    sqlQuery := BuildFilteredAttendeeAnalysisQuery(joinClause, whereClause, limitIdx, offsetIdx, pageIdx, limitIdx2)
    result, err := postgres.QueryJSON[PaginatedAttendeeAnalysis](ctx, r.DB, sqlQuery, args...)
    if err != nil {
        return nil, err
    }
    if result == nil {
        return &PaginatedAttendeeAnalysis{
            Data: []AttendeeAnalysisItem{},
        }, nil
    }
    if result.Data == nil {
        result.Data = []AttendeeAnalysisItem{}
    }
    return result, nil
}

func (r *App) ListDeviceSubEventsRepository(ctx context.Context, tokenHash string) ([]DeviceEventSubEvents, error) {
    return postgres.QueryJSONSlice[DeviceEventSubEvents](ctx, r.DB, ListDeviceSubEventsQuery, tokenHash)
}
