package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// DBTX is the common interface implemented by both *pgxpool.Pool and pgx.Tx.
// Accepting DBTX allows all query functions to run standalone or within a transaction.
type DBTX interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// Standard database error sentinels
var (
	ErrNotFound     = errors.New("requested resource not found")
	ErrForbidden    = errors.New("access denied for entity")
	ErrInvalidState = errors.New("invalid state machine transition")
	ErrConflict     = errors.New("resource conflict or constraint violation")
	ErrInternalDB   = errors.New("unexpected database error")
)

// MapPgError maps PostgreSQL SQLSTATE error codes and pgx errors into generic domain sentinels.
func MapPgError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "02000":
			return fmt.Errorf("%w: %s", ErrNotFound, pgErr.Message)
		case "42501":
			return fmt.Errorf("%w: %s", ErrForbidden, pgErr.Message)
		case "23505":
			return fmt.Errorf("%w: %s", ErrConflict, pgErr.Message)
		case "P0001", "P0002":
			return fmt.Errorf("%w: %s", ErrInvalidState, pgErr.Message)
		case "57014":
			return fmt.Errorf("%w: %s", context.DeadlineExceeded, pgErr.Message)
		default:
			return fmt.Errorf("%w [SQLSTATE %s]: %s", ErrInternalDB, pgErr.Code, pgErr.Message)
		}
	}
	return err
}

// QueryJSON executes a query returning a single JSONB document and deserializes it into *T.
func QueryJSON[T any](ctx context.Context, db DBTX, sqlQuery string, args ...any) (*T, error) {
	var raw []byte
	err := db.QueryRow(ctx, sqlQuery, args...).Scan(&raw)
	if err != nil {
		return nil, MapPgError(err)
	}
	if len(raw) == 0 {
		return nil, ErrNotFound
	}
	var dst T
	if err := json.Unmarshal(raw, &dst); err != nil {
		return nil, fmt.Errorf("postgres: decode json: %w", err)
	}
	return &dst, nil
}

// QueryJSONSlice executes a query returning a JSONB array document and deserializes it into []T.
// If the result is empty or null, it returns an empty slice []T{}.
func QueryJSONSlice[T any](ctx context.Context, db DBTX, sqlQuery string, args ...any) ([]T, error) {
	var raw []byte
	err := db.QueryRow(ctx, sqlQuery, args...).Scan(&raw)
	if err != nil {
		return nil, MapPgError(err)
	}
	if len(raw) == 0 {
		return []T{}, nil
	}

	var dst []T
	if err := json.Unmarshal(raw, &dst); err != nil {
		return nil, fmt.Errorf("postgres: decode json slice: %w", err)
	}
	if dst == nil {
		dst = []T{}
	}
	return dst, nil
}

// Exec executes an INSERT/UPDATE/DELETE statement with no result set.
func Exec(ctx context.Context, db DBTX, sqlQuery string, args ...any) error {
	_, err := db.Exec(ctx, sqlQuery, args...)
	return MapPgError(err)
}
