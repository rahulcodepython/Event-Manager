// Package postgres owns the Postgres connection pool and JSON query execution helpers.
package postgres

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"identitycard-server/internal/config"
	"identitycard-server/internal/pkg/retry"
)

// Connect creates and returns a tuned pgx connection pool with retry logic and ping verification.
func Connect(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("db: parse config: %w", err)
	}

	if cfg.DBMaxOpenConns > 0 {
		poolCfg.MaxConns = int32(cfg.DBMaxOpenConns)
	}
	if cfg.DBMaxIdleConns > 0 {
		poolCfg.MinConns = int32(cfg.DBMaxIdleConns)
	}
	if cfg.DBConnMaxLifetimeMin > 0 {
		poolCfg.MaxConnLifetime = time.Duration(cfg.DBConnMaxLifetimeMin) * time.Minute
	} else {
		poolCfg.MaxConnLifetime = time.Hour
	}
	if cfg.DBConnMaxIdleTimeMin > 0 {
		poolCfg.MaxConnIdleTime = time.Duration(cfg.DBConnMaxIdleTimeMin) * time.Minute
	} else {
		poolCfg.MaxConnIdleTime = 30 * time.Minute
	}
	poolCfg.HealthCheckPeriod = 1 * time.Minute

	if poolCfg.ConnConfig.RuntimeParams == nil {
		poolCfg.ConnConfig.RuntimeParams = make(map[string]string)
	}
	stmtTimeoutMs := 15000
	if cfg.DBStatementTimeoutSec > 0 {
		stmtTimeoutMs = cfg.DBStatementTimeoutSec * 1000
	}
	poolCfg.ConnConfig.RuntimeParams["statement_timeout"] = fmt.Sprintf("%d", stmtTimeoutMs)

	const maxAttempts = 5
	var pool *pgxpool.Pool

	connectErr := retry.Connect("postgres", maxAttempts, 2*time.Second, func() error {
		p, err := pgxpool.NewWithConfig(ctx, poolCfg)
		if err != nil {
			return err
		}
		pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if err := p.Ping(pingCtx); err != nil {
			p.Close()
			return err
		}
		pool = p
		return nil
	})

	if connectErr != nil {
		return nil, fmt.Errorf("db: connect failed after %d attempts: %w", maxAttempts, connectErr)
	}

	slog.Info("connected to postgres",
		"max_conns", poolCfg.MaxConns,
		"min_conns", poolCfg.MinConns,
		"max_lifetime", poolCfg.MaxConnLifetime.String(),
		"max_idle", poolCfg.MaxConnIdleTime.String(),
	)

	return pool, nil
}

// Close gracefully closes the postgres connection pool.
func Close(pool *pgxpool.Pool) {
	if pool != nil {
		pool.Close()
		slog.Info("postgres connection pool closed")
	}
}
