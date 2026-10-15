// Package reminders emails a client before their event goes read-only and
// before its data is deleted:
//
//   credit_end_1d  1 day before the credit ends
//   prune_7d       7 days before data deletion (backup longer than 7 days)
//   prune_1d       1 day before data deletion (any backup period)
//
// Each reminder is recorded in credit_reminders when queued, so it goes out
// once.
package reminders

import (
    "bytes"
    "context"
    "errors"
    "fmt"
    "html/template"
    "log/slog"
    "strings"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/pkg/jobqueue"
    "identitycard-server/internal/pkg/mailer"
    "identitycard-server/internal/pkg/postgres"
)

// JobType: job id is "<credit id>:<kind>".
const JobType = "reminder"

const (
    runEvery = 10 * time.Minute
    lockKey  = "reminders:lock"

    // dueQuery records every reminder that is due now and returns its job id.
    dueQuery = `
        WITH candidates AS (
            SELECT ce.credit_id, k.kind
            FROM credit_entitlements ce
            JOIN events e ON e.credit_id = ce.credit_id
            CROSS JOIN LATERAL (VALUES
                ('credit_end_1d', ce.ends_at > now() AND ce.ends_at <= now() + interval '1 day'),
                ('prune_7d', ce.backup_days > 7 AND ce.prune_at > now() AND ce.prune_at <= now() + interval '7 days'),
                ('prune_1d', ce.backup_days >= 1 AND ce.prune_at > now() AND ce.prune_at <= now() + interval '1 day')
            ) AS k(kind, due)
            WHERE k.due AND NOT ce.is_suspended
        )
        INSERT INTO credit_reminders (credit_id, kind)
        SELECT credit_id, kind FROM candidates
        ON CONFLICT DO NOTHING
        RETURNING credit_id::text || ':' || kind;
    `

    reminderQuery = `
        SELECT jsonb_build_object(
            'email', u.email,
            'owner_name', u.name,
            'organization', o.name,
            'credit_name', c.name,
            'event_id', e.id,
            'event_name', COALESCE(em.name, ''),
            'ends_at', ce.ends_at,
            'prune_at', ce.prune_at
        )
        FROM credit_entitlements ce
        JOIN credits c ON c.id = ce.credit_id
        JOIN organizations o ON o.id = c.organization_id
        JOIN users u ON u.id = o.owner_id
        JOIN events e ON e.credit_id = c.id
        LEFT JOIN event_metadata em ON em.id = e.id
        WHERE ce.credit_id = $1::uuid;
    `
)

type App struct {
    DB     *pgxpool.Pool
    Redis  *redis.Client
    Queue  *jobqueue.Queue
    Mailer *mailer.Mailer
    WebURL string
}

func NewApp(db *pgxpool.Pool, rdb *redis.Client, queue *jobqueue.Queue, m *mailer.Mailer, webURL string) *App {
    return &App{DB: db, Redis: rdb, Queue: queue, Mailer: m, WebURL: webURL}
}

type reminder struct {
    Email        string    `json:"email"`
    OwnerName    string    `json:"owner_name"`
    Organization string    `json:"organization"`
    CreditName   string    `json:"credit_name"`
    EventID      string    `json:"event_id"`
    EventName    string    `json:"event_name"`
    EndsAt       time.Time `json:"ends_at"`
    PruneAt      time.Time `json:"prune_at"`
}

// StartScheduler queues due reminders every 10 minutes until ctx ends.
func (s *App) StartScheduler(ctx context.Context) {
    go func() {
        ticker := time.NewTicker(runEvery)
        defer ticker.Stop()
        for {
            s.queueDue(ctx)
            select {
            case <-ctx.Done():
                return
            case <-ticker.C:
            }
        }
    }()
}

func (s *App) queueDue(ctx context.Context) {
    ok, err := s.Redis.SetNX(ctx, lockKey, "1", runEvery).Result()
    if err != nil || !ok {
        return
    }
    rows, err := s.DB.Query(ctx, dueQuery)
    if err != nil {
        slog.Error("reminders: due", "error", err)
        return
    }
    ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
    if err != nil {
        slog.Error("reminders: due rows", "error", err)
        return
    }
    if err := s.Queue.EnqueueAll(ctx, JobType, ids); err != nil {
        slog.Error("reminders: enqueue", "error", err)
    }
}

func (s *App) JobHandler() jobqueue.Handler {
    return jobqueue.Handler{Run: s.send}
}

func (s *App) send(ctx context.Context, job jobqueue.Job) error {
    creditID, kind, ok := strings.Cut(job.ID, ":")
    if !ok {
        return jobqueue.Permanent(fmt.Errorf("bad reminder id %q", job.ID))
    }
    r, err := postgres.QueryJSON[reminder](ctx, s.DB, reminderQuery, creditID)
    if errors.Is(err, postgres.ErrNotFound) {
        return nil // event deleted meanwhile
    }
    if err != nil {
        return err
    }

    subject, html, text, err := s.render(kind, r)
    if err != nil {
        return jobqueue.Permanent(err)
    }
    err = s.Mailer.Send(ctx, mailer.Message{To: r.Email, Subject: subject, HTML: html, Text: text})
    var permanent *mailer.PermanentError
    if errors.Is(err, mailer.ErrNotConfigured) || errors.As(err, &permanent) {
        return jobqueue.Permanent(err)
    }
    return err
}

var reminderEmail = template.Must(template.New("reminder").Parse(`<!doctype html>
<html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px" cellpadding="0" cellspacing="0">
<tr><td>
<h1 style="font-size:18px;margin:0 0 12px">{{.Title}}</h1>
<p style="font-size:14px;line-height:1.6;margin:0 0 12px">Hi {{.Name}},</p>
<p style="font-size:14px;line-height:1.6;margin:0 0 16px">{{.Body}}</p>
<a href="{{.URL}}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">Open event</a>
</td></tr></table>
</td></tr></table>
</body></html>`))

func (s *App) render(kind string, r *reminder) (subject, html, text string, err error) {
    const layout = "2 Jan 2006, 15:04 MST"
    var title, body string
    switch kind {
    case "credit_end_1d":
        title = fmt.Sprintf("%s becomes read-only tomorrow", r.EventName)
        body = fmt.Sprintf("The credit \"%s\" for %s ends on %s. After that the event is read-only: no new applicants, scans or changes. Its data is deleted on %s.",
            r.CreditName, r.EventName, r.EndsAt.Format(layout), r.PruneAt.Format(layout))
    case "prune_7d", "prune_1d":
        when := "in 7 days"
        if kind == "prune_1d" {
            when = "tomorrow"
        }
        title = fmt.Sprintf("%s data is deleted %s", r.EventName, when)
        body = fmt.Sprintf("All data of %s (applicants, attendance, form) is permanently deleted on %s. Export anything you need before then.",
            r.EventName, r.PruneAt.Format(layout))
    default:
        return "", "", "", fmt.Errorf("unknown reminder kind %q", kind)
    }

    name := r.OwnerName
    if name == "" {
        name = r.Organization
    }
    url := fmt.Sprintf("%s/dashboard/events/%s", s.WebURL, r.EventID)
    var buf bytes.Buffer
    err = reminderEmail.Execute(&buf, map[string]string{"Title": title, "Name": name, "Body": body, "URL": url})
    return title, buf.String(), fmt.Sprintf("Hi %s,\n\n%s\n\n%s\n", name, body, url), err
}
