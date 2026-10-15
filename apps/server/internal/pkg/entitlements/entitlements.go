// Package entitlements reads what an event's credit allows, from the
// credit_entitlements view.
package entitlements

import (
    "context"
    "errors"
    "time"

    "identitycard-server/internal/pkg/postgres"
)

// ErrReadOnly is returned for writes to an event whose credit has ended.
var ErrReadOnly = errors.New("this event's credit has ended; the event is read-only")

type Event struct {
    CreditID       string    `json:"credit_id"`
    Kind           string    `json:"kind"`
    EndsAt         time.Time `json:"ends_at"`
    IsExpired      bool      `json:"is_expired"`
    ApplicantLimit int       `json:"applicant_limit"`
    HasBranding    bool      `json:"has_branding"`
    SubEventLimit  int       `json:"sub_event_limit"`
    BackupDays     int       `json:"backup_days"`
    PruneAt        time.Time `json:"prune_at"`
}

const forEventQuery = `
    SELECT to_jsonb(ce) FROM credit_entitlements ce
    JOIN events e ON e.credit_id = ce.credit_id
    WHERE e.id = $1::uuid;
`

// ForEvent returns the limits of an event's credit (postgres.ErrNotFound if
// the event does not exist).
func ForEvent(ctx context.Context, db postgres.DBTX, eventID string) (*Event, error) {
    return postgres.QueryJSON[Event](ctx, db, forEventQuery, eventID)
}

// RequireWritable returns ErrReadOnly once the event's credit has ended.
func RequireWritable(ctx context.Context, db postgres.DBTX, eventID string) error {
    ent, err := ForEvent(ctx, db, eventID)
    if err != nil {
        return err
    }
    if ent.IsExpired {
        return ErrReadOnly
    }
    return nil
}
