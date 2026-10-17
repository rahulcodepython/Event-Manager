package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// WithTx runs fn inside a transaction, committing on success and rolling
// back otherwise (including on panic). Used for writes that span more than
// one module's repository — e.g. registration creates a user, an
// organization, a subscription, and a membership atomically.
func WithTx(ctx context.Context, pool *pgxpool.Pool, fn func(pgx.Tx) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op once committed

	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// LockKey takes a transaction-scoped advisory lock on key, serializing
// transactions that touch the same logical resource (e.g. an event's
// applicant count). Released at commit or rollback.
func LockKey(ctx context.Context, tx pgx.Tx, key string) error {
    _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", key)
    return MapPgError(err)
}

// EventApplicantsLockKey is the advisory lock key every applicant insert
// for an event takes (dashboard, bulk upload and public registration).
func EventApplicantsLockKey(eventID string) string {
    return "event_applicants:" + eventID
}
