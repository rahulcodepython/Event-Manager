package retention

import (
    "context"
    "log/slog"
    "time"

    "github.com/jackc/pgx/v5"
)

const (
    runEvery = time.Hour
    // Only one API instance prunes at a time; the lock outlives one run.
    lockKey = "retention:lock"
    lockTTL = 10 * time.Minute

    dueEventsQuery = `
        SELECT e.id::text
        FROM events e
        JOIN credit_entitlements ce ON ce.credit_id = e.credit_id
        WHERE ce.prune_at <= now();
    `
)

// StartWorker prunes once at startup and then every hour until ctx ends.
func (s *App) StartWorker(ctx context.Context) {
    go func() {
        ticker := time.NewTicker(runEvery)
        defer ticker.Stop()
        for {
            s.pruneOnce(ctx)
            select {
            case <-ctx.Done():
                return
            case <-ticker.C:
            }
        }
    }()
}

func (s *App) pruneOnce(ctx context.Context) {
    acquired, err := s.Redis.SetNX(ctx, lockKey, "1", lockTTL).Result()
    if err != nil || !acquired {
        return
    }
    defer s.Redis.Del(context.WithoutCancel(ctx), lockKey)

    rows, err := s.DB.Query(ctx, dueEventsQuery)
    if err != nil {
        slog.Error("retention: list due events", "error", err)
        return
    }
    ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
    if err != nil {
        slog.Error("retention: read due events", "error", err)
        return
    }

    for _, id := range ids {
        if err := s.Events.DeleteService(ctx, id); err != nil {
            slog.Error("retention: delete event", "event_id", id, "error", err)
            continue
        }
        slog.Info("retention: event data deleted", "event_id", id)
    }
}
