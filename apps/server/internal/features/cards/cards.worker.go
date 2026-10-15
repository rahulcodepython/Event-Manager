package cards

import (
    "context"
    "errors"
    "fmt"
    "log/slog"
    "time"

    "identitycard-server/internal/pkg/idcard"
    "identitycard-server/internal/pkg/jobqueue"
    "identitycard-server/internal/pkg/mailer"
    "identitycard-server/internal/pkg/postgres"
)

const (
    schedulerEvery = time.Minute
    schedulerLock  = "cards:scheduler:lock"
)

// staleAfter: a queued card untouched this long is enqueued again. Longer
// than the queue's longest backoff so a pending retry is not duplicated.
var staleAfter = jobqueue.MaxBackoff + 15*time.Minute

// StartScheduler publishes due cards and re-queues stuck ones every minute
// until ctx ends. A Redis lock keeps it to one API instance per run.
func (s *App) StartScheduler(ctx context.Context) {
    go func() {
        ticker := time.NewTicker(schedulerEvery)
        defer ticker.Stop()
        for {
            s.tick(ctx)
            select {
            case <-ctx.Done():
                return
            case <-ticker.C:
            }
        }
    }()
}

func (s *App) tick(ctx context.Context) {
    ok, err := s.Redis.SetNX(ctx, schedulerLock, "1", schedulerEvery).Result()
    if err != nil || !ok {
        return
    }
    if err := s.publishDue(ctx, ""); err != nil {
        slog.Error("cards: publish due", "error", err)
    }
    ids, err := s.StaleQueuedRepository(ctx, int(staleAfter.Minutes()))
    if err != nil {
        slog.Error("cards: stale sweep", "error", err)
        return
    }
    if err := s.Queue.EnqueueAll(ctx, JobType, ids); err != nil {
        slog.Error("cards: enqueue stale", "error", err)
    }
}

// JobHandler sends one card email.
func (s *App) JobHandler() jobqueue.Handler {
    return jobqueue.Handler{
        Run: s.sendCard,
        OnRetry: func(ctx context.Context, job jobqueue.Job, err error) {
            s.markRepository(ctx, MarkRetryQuery, job.ID, err.Error())
        },
        OnFail: func(ctx context.Context, job jobqueue.Job, err error) {
            s.markRepository(ctx, MarkFailedQuery, job.ID, err.Error())
        },
    }
}

func (s *App) sendCard(ctx context.Context, job jobqueue.Job) error {
    data, err := s.CardByJobRepository(ctx, job.ID)
    if errors.Is(err, postgres.ErrNotFound) {
        return nil // applicant or event deleted meanwhile
    }
    if err != nil {
        return err
    }
    if data.CardStatus != "queued" {
        return nil // already sent, or a duplicate job
    }

    card := s.card(data)
    pdf, err := idcard.Render(ctx, card)
    if err != nil {
        return jobqueue.Permanent(err)
    }
    html, text, err := renderCardEmail(data)
    if err != nil {
        return jobqueue.Permanent(err)
    }

    err = s.Mailer.Send(ctx, mailer.Message{
        To:          data.Email,
        Subject:     fmt.Sprintf("Your ID card for %s", data.EventName),
        HTML:        html,
        Text:        text,
        Attachments: []mailer.Attachment{{Filename: idcard.Filename(card), Content: pdf}},
    })
    var permanent *mailer.PermanentError
    if errors.Is(err, mailer.ErrNotConfigured) || errors.As(err, &permanent) {
        return jobqueue.Permanent(err)
    }
    if err != nil {
        return err
    }
    s.markRepository(ctx, MarkSentQuery, job.ID)
    return nil
}
