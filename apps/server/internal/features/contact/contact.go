// Package contact receives the landing page's contact form: messages are
// stored, then emailed to CONTACT_EMAIL through the email queue.
package contact

import (
    "context"
    "errors"
    "fmt"
    "html/template"
    "bytes"
    "net/mail"
    "strings"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/pkg/jobqueue"
    "identitycard-server/internal/pkg/mailer"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/utils"
)

// JobType emails one stored message (id = contact_messages.id).
const JobType = "contact"

const (
    ipWindow     = time.Hour
    maxMessage   = 5000
    redisKeyIP   = "contact:ip:%s"
)

var (
    ErrInvalid     = errors.New("invalid message")
    ErrRateLimited = errors.New("too many messages, please try again later")
)

type App struct {
    DB     *pgxpool.Pool
    Redis  *redis.Client
    Queue  *jobqueue.Queue
    Mailer *mailer.Mailer
    // To: where messages go; empty keeps them in the database only.
    To string
    // MaxPerHour: messages per IP per hour (CONTACT_MAX_PER_HOUR).
    MaxPerHour int
}

func NewApp(db *pgxpool.Pool, rdb *redis.Client, queue *jobqueue.Queue, m *mailer.Mailer, to string, maxPerHour int) *App {
    return &App{DB: db, Redis: rdb, Queue: queue, Mailer: m, To: to, MaxPerHour: maxPerHour}
}

type Request struct {
    Name    string `json:"name"`
    Email   string `json:"email"`
    Message string `json:"message"`
    // Website is a honeypot: hidden on the form, filled only by bots.
    Website string `json:"website"`
}

func (h *App) RegisterPublicRoutes(r fiber.Router) {
    r.Post("/public/contact", h.SubmitHandler)
}

func (h *App) SubmitHandler(c *fiber.Ctx) error {
    var req Request
    if err := c.BodyParser(&req); err != nil {
        return utils.ErrBadRequest(c, "invalid request body", err)
    }
    if err := h.SubmitService(c.UserContext(), c.IP(), req); err != nil {
        switch {
        case errors.Is(err, ErrInvalid):
            return utils.ErrBadRequest(c, err.Error(), err)
        case errors.Is(err, ErrRateLimited):
            return utils.ErrTooManyRequests(c, err.Error(), err)
        }
        return utils.ErrInternal(c, "failed to send message", err)
    }
    return utils.OKEmpty(c, "message sent")
}

func (h *App) SubmitService(ctx context.Context, ip string, req Request) error {
    req.Name = strings.TrimSpace(req.Name)
    req.Email = strings.TrimSpace(req.Email)
    req.Message = strings.TrimSpace(req.Message)
    if req.Website != "" {
        return nil // bot: pretend success
    }
    switch {
    case req.Name == "" || len(req.Name) > 200:
        return fmt.Errorf("%w: name is required", ErrInvalid)
    case len(req.Email) > 320:
        return fmt.Errorf("%w: invalid email", ErrInvalid)
    case req.Message == "":
        return fmt.Errorf("%w: message is required", ErrInvalid)
    case len(req.Message) > maxMessage:
        return fmt.Errorf("%w: message is longer than %d characters", ErrInvalid, maxMessage)
    }
    if _, err := mail.ParseAddress(req.Email); err != nil {
        return fmt.Errorf("%w: invalid email", ErrInvalid)
    }

    key := fmt.Sprintf(redisKeyIP, ip)
    n, err := h.Redis.Incr(ctx, key).Result()
    if err == nil && n == 1 {
        h.Redis.Expire(ctx, key, ipWindow)
    }
    if n > int64(h.MaxPerHour) {
        return ErrRateLimited
    }

    var id string
    err = h.DB.QueryRow(ctx,
        `INSERT INTO contact_messages (name, email, message, ip) VALUES ($1, $2, $3, $4) RETURNING id::text`,
        req.Name, req.Email, req.Message, ip).Scan(&id)
    if err != nil {
        return postgres.MapPgError(err)
    }
    if h.To != "" {
        // A failed enqueue leaves the message stored; it is not lost.
        _ = h.Queue.Enqueue(ctx, jobqueue.Job{Type: JobType, ID: id})
    }
    return nil
}

var emailTemplate = template.Must(template.New("contact").Parse(`<p><strong>{{.Name}}</strong> &lt;{{.Email}}&gt; wrote:</p>
<pre style="white-space:pre-wrap;font-family:inherit">{{.Message}}</pre>`))

// JobHandler emails one stored message.
func (h *App) JobHandler() jobqueue.Handler {
    return jobqueue.Handler{Run: h.send}
}

func (h *App) send(ctx context.Context, job jobqueue.Job) error {
    var name, email, message string
    var emailed bool
    err := h.DB.QueryRow(ctx,
        `SELECT name, email, message, emailed_at IS NOT NULL FROM contact_messages WHERE id = $1::uuid`, job.ID,
    ).Scan(&name, &email, &message, &emailed)
    if err != nil {
        if errors.Is(postgres.MapPgError(err), postgres.ErrNotFound) {
            return nil
        }
        return err
    }
    if emailed {
        return nil
    }

    var html bytes.Buffer
    if err := emailTemplate.Execute(&html, map[string]string{"Name": name, "Email": email, "Message": message}); err != nil {
        return jobqueue.Permanent(err)
    }
    err = h.Mailer.Send(ctx, mailer.Message{
        To:      h.To,
        Subject: "Contact form: " + name,
        HTML:    html.String(),
        Text:    fmt.Sprintf("%s <%s> wrote:\n\n%s\n", name, email, message),
    })
    var permanent *mailer.PermanentError
    if errors.Is(err, mailer.ErrNotConfigured) || errors.As(err, &permanent) {
        return jobqueue.Permanent(err)
    }
    if err != nil {
        return err
    }
    _, _ = h.DB.Exec(ctx, `UPDATE contact_messages SET emailed_at = now() WHERE id = $1::uuid`, job.ID)
    return nil
}
