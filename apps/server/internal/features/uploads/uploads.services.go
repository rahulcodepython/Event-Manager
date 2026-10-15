package uploads

import (
    "bytes"
    "context"
    "errors"
    "fmt"
    "log/slog"
    "path"
    "strings"
    "time"

    "github.com/google/uuid"

    "identitycard-server/internal/pkg/imageproc"
    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrFormClosed    = errors.New("this form is not accepting applications")
    ErrNoSuchField   = errors.New("this form has no such image field")
    ErrTooMany       = errors.New("too many uploads, please try again later")
    ErrImageRequired = errors.New("a required image is missing")
    ErrBadToken      = errors.New("the uploaded image is invalid or expired; upload it again")
)

const (
    uploadWindow = time.Hour
)

// imageField is a photo or signature field of a form.
type imageField struct {
    Key        string `json:"key"`
    Label      string `json:"label"`
    Type       string `json:"type"`
    Required   bool   `json:"required"`
    Validation struct {
        MinWidth  *int `json:"min_width"`
        MinHeight *int `json:"min_height"`
    } `json:"validation"`
}

type formImages struct {
    EventID string       `json:"event_id"`
    Open    bool         `json:"open"`
    Fields  []imageField `json:"fields"`
}

// formImagesQuery: the form's event, whether it accepts applications now,
// and its image fields.
const formImagesQuery = `
    SELECT jsonb_build_object(
        'event_id', ef.event_id,
        'open', ef.is_locked AND ef.status = 'live' AND ef.expires_at > now()
                AND NOT ce.is_expired AND NOT ce.is_suspended,
        'fields', COALESCE((
            SELECT jsonb_agg(f) FROM jsonb_array_elements(ef.fields) f
            WHERE f->>'type' IN ('photo', 'signature')
        ), '[]'::jsonb)
    )
    FROM event_forms ef
    JOIN events e ON e.id = ef.event_id
    JOIN credit_entitlements ce ON ce.credit_id = e.credit_id
    WHERE ef.id::text = $1;
`

func (s *App) formImages(ctx context.Context, formID string) (*formImages, error) {
    return postgres.QueryJSON[formImages](ctx, s.DB, formImagesQuery, formID)
}

func minSize(f imageField) (int, int) {
    w, h := 300, 300
    if f.Type == "signature" {
        h = 100
    }
    if f.Validation.MinWidth != nil && *f.Validation.MinWidth > 0 {
        w = *f.Validation.MinWidth
    }
    if f.Validation.MinHeight != nil && *f.Validation.MinHeight > 0 {
        h = *f.Validation.MinHeight
    }
    return w, h
}

// UploadService checks and stores one image for a field of an open form
// and returns its token.
func (s *App) UploadService(ctx context.Context, ip, formID, fieldKey string, data []byte) (string, error) {
    key := "uploads:ip:" + ip
    if n, err := s.Redis.Incr(ctx, key).Result(); err == nil {
        if n == 1 {
            s.Redis.Expire(ctx, key, uploadWindow)
        }
        if n > int64(s.maxPerHour) {
            return "", ErrTooMany
        }
    }

    form, err := s.formImages(ctx, formID)
    if errors.Is(err, postgres.ErrNotFound) {
        return "", ErrFormClosed
    }
    if err != nil {
        return "", err
    }
    if !form.Open {
        return "", ErrFormClosed
    }
    var field *imageField
    for i := range form.Fields {
        if form.Fields[i].Key == fieldKey {
            field = &form.Fields[i]
        }
    }
    if field == nil {
        return "", ErrNoSuchField
    }

    minW, minH := minSize(*field)
    img, err := imageproc.Process(imageproc.Kind(field.Type), data, minW, minH)
    if err != nil {
        return "", err
    }
    objectKey := pendingPrefix + uuid.NewString() + "." + img.Ext
    if err := s.Store.Put(ctx, objectKey, bytes.NewReader(img.Data), int64(len(img.Data)), img.ContentType); err != nil {
        return "", err
    }
    return s.sign(formID, fieldKey, objectKey), nil
}

// Claim is the result of exchanging a submission's tokens.
type Claim struct {
    // Keys: the stored images, to delete if the submission fails.
    Keys []string
}

// ClaimImages replaces each image field's token in data with the stored
// image's key (copied to applicants/<event>/), checks required images, and
// drops any other value a client sent for those fields.
func (s *App) ClaimImages(ctx context.Context, formID string, data map[string]any) (*Claim, error) {
    claim := &Claim{}
    form, err := s.formImages(ctx, formID)
    if err != nil {
        return nil, err
    }
    for _, f := range form.Fields {
        token, _ := data[f.Key].(string)
        delete(data, f.Key)
        if strings.TrimSpace(token) == "" {
            if f.Required {
                s.Discard(ctx, claim)
                return nil, fmt.Errorf("%w: %s", ErrImageRequired, f.Label)
            }
            continue
        }
        pending, ok := s.verify(formID, f.Key, token)
        if !ok {
            s.Discard(ctx, claim)
            return nil, ErrBadToken
        }
        final := EventPrefix(form.EventID) + uuid.NewString() + path.Ext(pending)
        if err := s.Store.Copy(ctx, pending, final); err != nil {
            s.Discard(ctx, claim)
            return nil, ErrBadToken
        }
        claim.Keys = append(claim.Keys, final)
        data[f.Key] = final
    }
    return claim, nil
}

// Discard deletes images claimed for a submission that then failed.
func (s *App) Discard(ctx context.Context, claim *Claim) {
    if claim == nil {
        return
    }
    for _, k := range claim.Keys {
        if err := s.Store.Delete(context.WithoutCancel(ctx), k); err != nil {
            slog.Warn("uploads: discard", "key", k, "error", err)
        }
    }
}

// DeleteFiles removes the images referenced by an applicant's data.
func (s *App) DeleteFiles(ctx context.Context, eventID string, data map[string]any) {
    for _, v := range data {
        if key, ok := v.(string); ok && strings.HasPrefix(key, EventPrefix(eventID)) {
            if err := s.Store.Delete(context.WithoutCancel(ctx), key); err != nil {
                slog.Warn("uploads: delete applicant file", "key", key, "error", err)
            }
        }
    }
}

// OnEventDeleted removes every image of the event's applicants.
func (s *App) OnEventDeleted(ctx context.Context, eventID string) {
    if err := s.Store.DeletePrefix(context.WithoutCancel(ctx), EventPrefix(eventID)); err != nil {
        slog.Warn("uploads: delete event files", "event", eventID, "error", err)
    }
}

// StartSweeper deletes pending uploads older than UPLOAD_PENDING_TTL, hourly.
func (s *App) StartSweeper(ctx context.Context) {
    go func() {
        ticker := time.NewTicker(time.Hour)
        defer ticker.Stop()
        for {
            if ok, err := s.Redis.SetNX(ctx, "uploads:sweep:lock", "1", time.Hour).Result(); err == nil && ok {
                if n, err := s.Store.DeleteOlderThan(ctx, pendingPrefix, time.Now().Add(-s.pendingTTL)); err != nil {
                    slog.Warn("uploads: sweep", "error", err)
                } else if n > 0 {
                    slog.Info("uploads: swept pending images", "count", n)
                }
            }
            select {
            case <-ctx.Done():
                return
            case <-ticker.C:
            }
        }
    }()
}

// ApplicantFile returns an applicant's image for one field of an event.
// The stored key must sit under the event's prefix.
func (s *App) ApplicantFile(ctx context.Context, eventID, applicantID, fieldKey string) (string, error) {
    var key string
    err := s.DB.QueryRow(ctx, `
        SELECT COALESCE(a.data->>$3, '') FROM applicants a
        JOIN event_applicants ea ON ea.user_id = a.id
        WHERE ea.event_id = $1::uuid AND ea.user_id = $2
    `, eventID, applicantID, fieldKey).Scan(&key)
    if err != nil {
        return "", postgres.MapPgError(err)
    }
    if !strings.HasPrefix(key, EventPrefix(eventID)) {
        return "", postgres.ErrNotFound
    }
    return key, nil
}
