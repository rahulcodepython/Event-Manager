package applicants

import (
    "context"

    "github.com/jackc/pgx/v5"

    "identitycard-server/internal/generic"
    "identitycard-server/internal/pkg/postgres"
)

func (r *App) GetAssignedFormRepository(ctx context.Context, eventID string) (*FormSummary, error) {
    return postgres.QueryJSON[FormSummary](ctx, r.DB, GetEventAssignedFormQuery, eventID)
}

func (r *App) QueryApplicantsWithFiltersRepository(ctx context.Context, whereClause string, limitIdx, offsetIdx, pageIdx, limitIdx2 int, args ...any) (*generic.PaginatedResponse[[]ApplicantItem], error) {
    sqlQuery := BuildFilteredApplicantsQuery(whereClause, limitIdx, offsetIdx, pageIdx, limitIdx2)
    result, err := postgres.QueryJSON[generic.PaginatedResponse[[]ApplicantItem]](ctx, r.DB, sqlQuery, args...)
    if err != nil {
        return nil, err
    }
    if result == nil {
        return &generic.PaginatedResponse[[]ApplicantItem]{
            Data: []ApplicantItem{},
        }, nil
    }
    if result.Data == nil {
        result.Data = []ApplicantItem{}
    }
    return result, nil
}

type createApplicantResult struct {
    Status    string         `json:"status"`
    Applicant *ApplicantItem `json:"applicant"`
}

// CreateApplicantRepository inserts under a per-event lock so concurrent
// inserts can't push the event past its applicant limit.
// CreateApplicantTx runs the capped insert inside tx under the event's
// applicant lock (held until tx ends).
func (r *App) CreateApplicantTx(ctx context.Context, tx pgx.Tx, eventID, userID, name, email, phone string, dataJSON []byte, extraCap int) (*createApplicantResult, error) {
    if err := postgres.LockKey(ctx, tx, postgres.EventApplicantsLockKey(eventID)); err != nil {
        return nil, err
    }
    return postgres.QueryJSON[createApplicantResult](ctx, tx, CreateApplicantAtomicQuery, eventID, userID, name, email, phone, dataJSON, extraCap)
}

// FindByEmailTx returns the applicant id registered for the event with this email.
func (r *App) FindByEmailTx(ctx context.Context, tx pgx.Tx, eventID, email string) (string, error) {
    var id string
    err := tx.QueryRow(ctx, `SELECT user_id FROM event_applicants WHERE event_id = $1::uuid AND email = $2`, eventID, email).Scan(&id)
    return id, postgres.MapPgError(err)
}

func (r *App) DeleteApplicantRepository(ctx context.Context, eventID, userID string) error {
    return postgres.Exec(ctx, r.DB, DeleteApplicantQuery, eventID, userID)
}
