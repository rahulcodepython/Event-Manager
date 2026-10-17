package cards

import (
    "context"
    "time"

    "github.com/jackc/pgx/v5"

    "identitycard-server/internal/pkg/postgres"
)

func (r *App) GetStatusRepository(ctx context.Context, eventID string) (*Status, error) {
    return postgres.QueryJSON[Status](ctx, r.DB, GetStatusQuery, eventID)
}

// FormStateRepository returns ErrNotFound when the event has no form.
func (r *App) FormStateRepository(ctx context.Context, eventID string) (published, closed bool, err error) {
    err = r.DB.QueryRow(ctx, FormStateQuery, eventID).Scan(&published, &closed)
    return published, closed, postgres.MapPgError(err)
}

func (r *App) execAffected(ctx context.Context, query string, args ...any) (bool, error) {
    tag, err := r.DB.Exec(ctx, query, args...)
    return tag.RowsAffected() > 0, postgres.MapPgError(err)
}

func (r *App) UpdateScheduleRepository(ctx context.Context, eventID string, closesAt, publishAt time.Time) (bool, error) {
    return r.execAffected(ctx, UpdateScheduleQuery, eventID, closesAt, publishAt)
}

func (r *App) CloseNowRepository(ctx context.Context, eventID string) (bool, error) {
    return r.execAffected(ctx, CloseNowQuery, eventID)
}

func (r *App) PublishNowRepository(ctx context.Context, eventID string) (bool, error) {
    return r.execAffected(ctx, PublishNowQuery, eventID)
}

func (r *App) collectIDs(ctx context.Context, query string, args ...any) ([]string, error) {
    rows, err := r.DB.Query(ctx, query, args...)
    if err != nil {
        return nil, postgres.MapPgError(err)
    }
    ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
    return ids, postgres.MapPgError(err)
}

func (r *App) PublishDueRepository(ctx context.Context, eventID string) ([]string, error) {
    return r.collectIDs(ctx, PublishDueQuery, eventID)
}

func (r *App) ResendRepository(ctx context.Context, eventID, scope, applicantID string) ([]string, error) {
    return r.collectIDs(ctx, ResendQuery, eventID, scope, applicantID)
}

func (r *App) StaleQueuedRepository(ctx context.Context, minutes int) ([]string, error) {
    return r.collectIDs(ctx, StaleQueuedQuery, minutes)
}

func (r *App) CardByJobRepository(ctx context.Context, eventApplicantID string) (*cardData, error) {
    return postgres.QueryJSON[cardData](ctx, r.DB, CardByJobQuery, eventApplicantID)
}

func (r *App) CardByApplicantRepository(ctx context.Context, eventID, applicantID string) (*cardData, error) {
    return postgres.QueryJSON[cardData](ctx, r.DB, CardByApplicantQuery, eventID, applicantID)
}

func (r *App) markRepository(ctx context.Context, query string, args ...any) {
    _ = postgres.Exec(context.WithoutCancel(ctx), r.DB, query, args...)
}
