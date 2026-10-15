package subevents

import (
    "context"

    "github.com/jackc/pgx/v5"

    "identitycard-server/internal/pkg/postgres"
)

func (r *App) OverviewRepository(ctx context.Context, eventID string) (*Overview, error) {
    return postgres.QueryJSON[Overview](ctx, r.DB, OverviewQuery, eventID)
}

func (r *App) GetRepository(ctx context.Context, id string) (*SubEvent, error) {
    return postgres.QueryJSON[SubEvent](ctx, r.DB, GetQuery, id)
}

func (r *App) BelongsRepository(ctx context.Context, eventID, id string) (bool, error) {
    var ok bool
    err := r.DB.QueryRow(ctx, BelongsQuery, id, eventID).Scan(&ok)
    return ok, postgres.MapPgError(err)
}

// CreateRepository creates a sub-event unless the credit's limit is reached,
// serialized per event so two creates cannot both take the last slot.
func (r *App) CreateRepository(ctx context.Context, eventID string, req SubEventRequest) (string, error) {
    var id string
    err := postgres.WithTx(ctx, r.DB, func(tx pgx.Tx) error {
        if err := postgres.LockKey(ctx, tx, "event_sub_events:"+eventID); err != nil {
            return err
        }
        var count, limit int
        if err := tx.QueryRow(ctx, CountAndLimitQuery, eventID).Scan(&count, &limit); err != nil {
            return postgres.MapPgError(err)
        }
        if count >= limit {
            return limitError(limit)
        }
        return postgres.MapPgError(tx.QueryRow(ctx, CreateQuery, eventID, req.Name, req.Description, req.Venue, req.Capacity, req.LinkEnabled).Scan(&id))
    })
    return id, err
}

func (r *App) UpdateRepository(ctx context.Context, id string, req SubEventRequest) error {
    return postgres.Exec(ctx, r.DB, UpdateQuery, id, req.Name, req.Description, req.Venue, req.Capacity, req.LinkEnabled)
}

func (r *App) EnrolledCountRepository(ctx context.Context, id string) (int, error) {
    var n int
    err := r.DB.QueryRow(ctx, EnrolledCountQuery, id).Scan(&n)
    return n, postgres.MapPgError(err)
}

func (r *App) DeleteRepository(ctx context.Context, id string) error {
    return postgres.Exec(ctx, r.DB, DeleteQuery, id)
}

func (r *App) UpdateSettingsRepository(ctx context.Context, eventID string, req SettingsRequest) (bool, error) {
    tag, err := r.DB.Exec(ctx, UpdateSettingsQuery, eventID, req.Mode, req.Required)
    return tag.RowsAffected() > 0, postgres.MapPgError(err)
}

func (r *App) ListEnrolledRepository(ctx context.Context, id, search string, page, limit int) (*EnrolledList, error) {
    return postgres.QueryJSON[EnrolledList](ctx, r.DB, ListEnrolledQuery, id, search, limit, (page-1)*limit)
}

func (r *App) EnrollRepository(ctx context.Context, eventID, applicantID string, subEventIDs []string) error {
    return postgres.WithTx(ctx, r.DB, func(tx pgx.Tx) error {
        return EnrollTx(ctx, tx, eventID, applicantID, subEventIDs, nil)
    })
}

func (r *App) UnenrollRepository(ctx context.Context, id, applicantID string) (bool, error) {
    tag, err := r.DB.Exec(ctx, UnenrollQuery, id, applicantID)
    return tag.RowsAffected() > 0, postgres.MapPgError(err)
}
