// Package jobqueue is a small durable job queue on a Redis stream with a
// consumer group. Failed jobs are retried with backoff through a sorted
// set; jobs a crashed worker left pending are reclaimed after claimIdle.
//
// Handlers must be idempotent: a job can run more than once (reclaim,
// duplicate enqueue). Jobs only carry ids; state lives in Postgres.
package jobqueue

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "log/slog"
    "os"
    "strconv"
    "time"

    "github.com/redis/go-redis/v9"
)

const (
    group       = "workers"
    maxAttempts = 5
    claimIdle   = 5 * time.Minute
    readBlock   = 5 * time.Second
)

// Backoff before attempt n+1 (index = attempts so far - 1).
var backoff = []time.Duration{time.Minute, 5 * time.Minute, 15 * time.Minute, 30 * time.Minute}

// MaxBackoff is the longest a job waits between attempts.
var MaxBackoff = backoff[len(backoff)-1]

// ErrPermanent marks a failure that retrying cannot fix.
var ErrPermanent = errors.New("permanent failure")

// Permanent wraps err so the queue gives up at once.
func Permanent(err error) error {
    return fmt.Errorf("%w: %w", ErrPermanent, err)
}

type Job struct {
    Type    string `json:"type"`
    ID      string `json:"id"`
    Attempt int    `json:"attempt"` // attempts already made
}

// Handler processes one job. OnFail runs once a job has failed for good.
type Handler struct {
    Run    func(ctx context.Context, job Job) error
    OnFail func(ctx context.Context, job Job, err error)
    // OnRetry runs when a failed job is scheduled again.
    OnRetry func(ctx context.Context, job Job, err error)
}

type Queue struct {
    redis    *redis.Client
    stream   string
    retryKey string
    consumer string
}

func New(rdb *redis.Client, name string) *Queue {
    host, _ := os.Hostname()
    return &Queue{
        redis:    rdb,
        stream:   "jobs:" + name,
        retryKey: "jobs:" + name + ":retry",
        consumer: host + "-" + strconv.Itoa(os.Getpid()),
    }
}

// Enqueue adds a job to the stream.
func (q *Queue) Enqueue(ctx context.Context, job Job) error {
    raw, err := json.Marshal(job)
    if err != nil {
        return err
    }
    return q.redis.XAdd(ctx, &redis.XAddArgs{
        Stream: q.stream,
        MaxLen: 100_000,
        Approx: true,
        Values: map[string]any{"job": string(raw)},
    }).Err()
}

// EnqueueAll adds one job per id, stopping at the first error.
func (q *Queue) EnqueueAll(ctx context.Context, jobType string, ids []string) error {
    for _, id := range ids {
        if err := q.Enqueue(ctx, Job{Type: jobType, ID: id}); err != nil {
            return err
        }
    }
    return nil
}

// Run consumes jobs until ctx ends. pace is the pause after each job, to
// stay under a provider's rate limit.
func (q *Queue) Run(ctx context.Context, handlers map[string]Handler, pace time.Duration) {
    err := q.redis.XGroupCreateMkStream(ctx, q.stream, group, "0").Err()
    if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
        slog.Error("jobqueue: create group", "stream", q.stream, "error", err)
    }

    lastClaim := time.Time{}
    for ctx.Err() == nil {
        q.promoteRetries(ctx)

        var msgs []redis.XMessage
        if time.Since(lastClaim) > time.Minute {
            lastClaim = time.Now()
            claimed, _, err := q.redis.XAutoClaim(ctx, &redis.XAutoClaimArgs{
                Stream: q.stream, Group: group, Consumer: q.consumer,
                MinIdle: claimIdle, Start: "0-0", Count: 20,
            }).Result()
            if err == nil {
                msgs = claimed
            }
        }

        if len(msgs) == 0 {
            res, err := q.redis.XReadGroup(ctx, &redis.XReadGroupArgs{
                Group: group, Consumer: q.consumer,
                Streams: []string{q.stream, ">"}, Count: 10, Block: readBlock,
            }).Result()
            if err != nil && !errors.Is(err, redis.Nil) {
                if ctx.Err() == nil {
                    slog.Error("jobqueue: read", "stream", q.stream, "error", err)
                    sleep(ctx, 5*time.Second)
                }
                continue
            }
            for _, s := range res {
                msgs = append(msgs, s.Messages...)
            }
        }

        for _, msg := range msgs {
            q.process(ctx, msg, handlers)
            sleep(ctx, pace)
        }
    }
}

func (q *Queue) process(ctx context.Context, msg redis.XMessage, handlers map[string]Handler) {
    defer func() {
        q.redis.XAck(context.WithoutCancel(ctx), q.stream, group, msg.ID)
        q.redis.XDel(context.WithoutCancel(ctx), q.stream, msg.ID)
    }()

    raw, _ := msg.Values["job"].(string)
    var job Job
    if err := json.Unmarshal([]byte(raw), &job); err != nil {
        slog.Error("jobqueue: bad job", "stream", q.stream, "id", msg.ID)
        return
    }
    h, ok := handlers[job.Type]
    if !ok {
        slog.Error("jobqueue: no handler", "type", job.Type)
        return
    }

    err := h.Run(ctx, job)
    if err == nil {
        return
    }
    job.Attempt++
    if errors.Is(err, ErrPermanent) || job.Attempt >= maxAttempts {
        slog.Warn("jobqueue: job failed", "type", job.Type, "id", job.ID, "attempts", job.Attempt, "error", err)
        if h.OnFail != nil {
            h.OnFail(ctx, job, err)
        }
        return
    }

    if h.OnRetry != nil {
        h.OnRetry(ctx, job, err)
    }
    retryAt := time.Now().Add(backoff[min(job.Attempt-1, len(backoff)-1)])
    next, _ := json.Marshal(job)
    q.redis.ZAdd(context.WithoutCancel(ctx), q.retryKey, redis.Z{Score: float64(retryAt.Unix()), Member: string(next)})
}

// promoteRetries moves retries that are due back onto the stream.
func (q *Queue) promoteRetries(ctx context.Context) {
    due, err := q.redis.ZRangeByScore(ctx, q.retryKey, &redis.ZRangeBy{
        Min: "-inf", Max: strconv.FormatInt(time.Now().Unix(), 10), Count: 100,
    }).Result()
    if err != nil {
        return
    }
    for _, member := range due {
        // Only the worker that removes the member re-adds it.
        if n, err := q.redis.ZRem(ctx, q.retryKey, member).Result(); err != nil || n == 0 {
            continue
        }
        var job Job
        if json.Unmarshal([]byte(member), &job) == nil {
            _ = q.Enqueue(ctx, job)
        }
    }
}

func sleep(ctx context.Context, d time.Duration) {
    if d <= 0 {
        return
    }
    select {
    case <-ctx.Done():
    case <-time.After(d):
    }
}
