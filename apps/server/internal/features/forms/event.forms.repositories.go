package forms

import (
    "context"
    "time"

    "github.com/jackc/pgx/v5"
    "identitycard-server/internal/pkg/postgres"
)

// UpdateEventFormQueryResult carries the outcome of atomic form update CTE.
type UpdateEventFormQueryResult struct {
    Exists   bool              `json:"exists"`
    IsLocked bool              `json:"is_locked"`
    Form     *EventFormDetails `json:"form"`
}

// LockEventFormQueryResult carries the outcome of atomic form lock CTE.
type LockEventFormQueryResult struct {
    Exists    bool              `json:"exists"`
    WasLocked bool              `json:"was_locked"`
    IsExpired bool              `json:"is_expired"`
    Form      *EventFormDetails `json:"form"`
}

// DeleteEventFormQueryResult carries the outcome of atomic form deletion CTE.
type DeleteEventFormQueryResult struct {
    Exists  bool `json:"exists"`
    Deleted bool `json:"deleted"`
}

func (r *App) GetEventFormRepository(ctx context.Context, eventID string) (*EventFormDetails, error) {
    return postgres.QueryJSON[EventFormDetails](ctx, r.DB, GetEventFormByEventIDQuery, eventID)
}

func (r *App) CreateFromTemplateRepository(ctx context.Context, eventID, templateID, name string, maxApplicants int, expiresAt time.Time) (*EventFormDetails, error) {
    return postgres.QueryJSON[EventFormDetails](ctx, r.DB, CreateEventFormFromTemplateQuery, eventID, templateID, name, maxApplicants, expiresAt)
}

func (r *App) CreateFromScratchRepository(ctx context.Context, eventID, name string, fieldsJSON []byte, maxApplicants int, expiresAt time.Time) (*EventFormDetails, error) {
    return postgres.QueryJSON[EventFormDetails](ctx, r.DB, CreateEventFormFromScratchQuery, eventID, name, fieldsJSON, maxApplicants, expiresAt)
}

func (r *App) UpdateEventFormRepository(ctx context.Context, eventID string, name *string, fieldsJSON []byte, maxApplicants *int, expiresAt *time.Time) (*UpdateEventFormQueryResult, error) {
    var fieldsArg any
    if fieldsJSON != nil {
        fieldsArg = string(fieldsJSON)
    }

    var result *UpdateEventFormQueryResult
    err := postgres.WithTx(ctx, r.DB, func(tx pgx.Tx) error {
        if fieldsJSON != nil {
            if _, err := tx.Exec(ctx, `
                DELETE FROM form_fields 
                WHERE event_form_id IN (
                    SELECT id FROM event_forms 
                    WHERE event_id = $1::uuid AND is_locked = false
                )
            `, eventID); err != nil {
                return postgres.MapPgError(err)
            }
        }
        var err error
        result, err = postgres.QueryJSON[UpdateEventFormQueryResult](ctx, tx, UpdateEventFormQuery, eventID, name, fieldsArg, maxApplicants, expiresAt)
        return err
    })
    if err != nil {
        return nil, err
    }
    return result, nil
}

func (r *App) LockEventFormRepository(ctx context.Context, eventID string) (*LockEventFormQueryResult, error) {
    return postgres.QueryJSON[LockEventFormQueryResult](ctx, r.DB, LockEventFormQuery, eventID)
}

func (r *App) DeleteEventFormRepository(ctx context.Context, eventID string) (*DeleteEventFormQueryResult, error) {
    return postgres.QueryJSON[DeleteEventFormQueryResult](ctx, r.DB, DeleteEventFormQuery, eventID)
}
