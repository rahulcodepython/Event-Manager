package uploads

import (
    "bytes"
    "context"
    "errors"
    "fmt"
    "io"
    "log/slog"
    "mime"
    "net/http"
    "net/url"
    "path"
    "strings"
    "time"

    "github.com/google/uuid"

    "identitycard-server/internal/pkg/imageproc"
    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrFormClosed    = errors.New("this form is not accepting applications")
    ErrNoSuchField   = errors.New("this form has no such upload field")
    ErrTooMany       = errors.New("too many uploads, please try again later")
    ErrImageRequired = errors.New("a required file is missing")
    ErrBadToken      = errors.New("the uploaded file is invalid or expired; upload it again")
    // ErrBadFile: a File Upload file of the wrong type or size.
    ErrBadFile = errors.New("invalid file")
)

const (
    uploadWindow = time.Hour
)

// imageField is an upload field of a form: photo, signature or file.
type imageField struct {
    Key        string `json:"key"`
    Label      string `json:"label"`
    Type       string `json:"type"`
    Required   bool   `json:"required"`
    Validation struct {
        MinWidth      *int     `json:"min_width"`
        MinHeight     *int     `json:"min_height"`
        Accept        *string  `json:"accept"`
        MaxFileSizeMB *float64 `json:"max_file_size_mb"`
        Multiple      *bool    `json:"multiple"`
    } `json:"validation"`
}

func (f imageField) multiple() bool {
    return f.Type == "file" && f.Validation.Multiple != nil && *f.Validation.Multiple
}

type formImages struct {
    EventID string       `json:"event_id"`
    Open    bool         `json:"open"`
    Fields  []imageField `json:"fields"`
}

// formImagesQuery: the form's event, whether it accepts applications now,
// and its upload fields.
const formImagesQuery = `
    SELECT jsonb_build_object(
        'event_id', ef.event_id,
        'open', ef.is_locked AND ef.status = 'live' AND ef.expires_at > now()
                AND NOT ce.is_expired AND NOT ce.is_suspended,
        'fields', COALESCE((
            SELECT jsonb_agg(f) FROM jsonb_array_elements(ef.fields) f
            WHERE f->>'type' IN ('photo', 'signature', 'file')
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

// MaxBytes is the largest upload any field accepts; the handler reads no more.
func (s *App) MaxBytes() int64 {
    return max(s.fileMax, imageproc.MaxUploadBytes)
}

// UploadService checks and stores one file for a field of an open form
// and returns its token.
func (s *App) UploadService(ctx context.Context, ip, formID, fieldKey, filename string, data []byte) (string, error) {
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

    var body []byte
    var ext, contentType string
    if field.Type == "file" {
        ext, err = s.checkFile(*field, filename, data)
        if err != nil {
            return "", err
        }
        body, contentType = data, contentTypeOf(ext)
    } else {
        if len(data) > imageproc.MaxUploadBytes {
            return "", fmt.Errorf("%w: the image must be %d MB or smaller", imageproc.ErrInvalid, imageproc.MaxUploadBytes>>20)
        }
        minW, minH := minSize(*field)
        img, err := imageproc.Process(imageproc.Kind(field.Type), data, minW, minH)
        if err != nil {
            return "", err
        }
        body, ext, contentType = img.Data, "."+img.Ext, img.ContentType
    }
    objectKey := pendingPrefix + uuid.NewString() + ext
    if err := s.Store.Put(ctx, objectKey, bytes.NewReader(body), int64(len(body)), contentType); err != nil {
        return "", err
    }
    return s.sign(formID, fieldKey, objectKey), nil
}

// fileTypes are the extensions a File Upload field can accept (the form
// designer's list). Longer ones come first so ".tar.gz" wins over ".gz".
var fileTypes = []string{
    ".tar.gz", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".pdf", ".docx", ".doc", ".txt", ".rtf",
    ".xlsx", ".xls", ".csv", ".json", ".pptx", ".ppt", ".mp3", ".wav", ".mp4", ".mov", ".webm",
    ".zip", ".rar", ".7z",
}

// defaultAccept applies when the field lists no types.
var defaultAccept = []string{".pdf", ".png", ".jpg", ".jpeg"}

// checkFile returns the file's extension if the field accepts its type
// and size. Images and PDFs must also look like what they claim to be.
func (s *App) checkFile(f imageField, filename string, data []byte) (string, error) {
    limit := s.fileMax
    if mb := f.Validation.MaxFileSizeMB; mb != nil && *mb > 0 && int64(*mb*(1<<20)) < limit {
        limit = int64(*mb * (1 << 20))
    }
    if int64(len(data)) > limit {
        return "", fmt.Errorf("%w: the file must be %.0f MB or smaller", ErrBadFile, float64(limit)/(1<<20))
    }
    if len(data) == 0 {
        return "", fmt.Errorf("%w: the file is empty", ErrBadFile)
    }
    name := strings.ToLower(filename)
    ext := ""
    for _, t := range fileTypes {
        if strings.HasSuffix(name, t) {
            ext = t
            break
        }
    }
    accept := defaultAccept
    if f.Validation.Accept != nil && strings.TrimSpace(*f.Validation.Accept) != "" {
        accept = nil
        for _, a := range strings.Split(*f.Validation.Accept, ",") {
            accept = append(accept, strings.ToLower(strings.TrimSpace(a)))
        }
    }
    allowed := false
    for _, a := range accept {
        if ext != "" && a == ext {
            allowed = true
        }
    }
    if !allowed {
        return "", fmt.Errorf("%w: use one of %s", ErrBadFile, strings.Join(accept, ", "))
    }
    sniffed := http.DetectContentType(data)
    switch ext {
    case ".png", ".jpg", ".jpeg", ".webp", ".gif":
        if !strings.HasPrefix(sniffed, "image/") {
            return "", fmt.Errorf("%w: this is not a %s image", ErrBadFile, ext)
        }
    case ".pdf":
        if sniffed != "application/pdf" {
            return "", fmt.Errorf("%w: this is not a PDF", ErrBadFile)
        }
    }
    return ext, nil
}

// contentTypeOf is the type a stored file is served with.
func contentTypeOf(ext string) string {
    if ext == ".tar.gz" {
        return "application/gzip"
    }
    if t := mime.TypeByExtension(ext); t != "" {
        return t
    }
    return "application/octet-stream"
}

// tokensOf reads a field value sent by the form: one token, or a list of
// tokens for a multi-file field.
func tokensOf(v any) []string {
    var out []string
    switch t := v.(type) {
    case string:
        if strings.TrimSpace(t) != "" {
            out = append(out, t)
        }
    case []any:
        for _, x := range t {
            if s, ok := x.(string); ok && strings.TrimSpace(s) != "" {
                out = append(out, s)
            }
        }
    case []string:
        for _, s := range t {
            if strings.TrimSpace(s) != "" {
                out = append(out, s)
            }
        }
    }
    return out
}

// Claim is the result of exchanging a submission's tokens.
type Claim struct {
    // Keys: the stored images, to delete if the submission fails.
    Keys []string
    // HasPhotoField: the form has its own Photo field.
    HasPhotoField bool
}

// GooglePhotoKey is the data key holding the photo taken from the
// applicant's Google picture (forms without a Photo field).
const GooglePhotoKey = "_photo"

// ClaimImages replaces each upload field's token in data with the stored
// file's key (copied to applicants/<event>/), checks required uploads, and
// drops any other value a client sent for those fields. A multi-file field
// holds a list of keys.
func (s *App) ClaimImages(ctx context.Context, formID string, data map[string]any) (*Claim, error) {
    claim := &Claim{}
    form, err := s.formImages(ctx, formID)
    if err != nil {
        return nil, err
    }
    delete(data, GooglePhotoKey) // only the server sets it
    for _, f := range form.Fields {
        if f.Type == "photo" {
            claim.HasPhotoField = true
        }
        tokens := tokensOf(data[f.Key])
        delete(data, f.Key)
        if len(tokens) == 0 {
            if f.Required {
                s.Discard(ctx, claim)
                return nil, fmt.Errorf("%w: %s", ErrImageRequired, f.Label)
            }
            continue
        }
        if len(tokens) > 1 && !f.multiple() {
            s.Discard(ctx, claim)
            return nil, ErrBadToken
        }
        keys := make([]any, 0, len(tokens))
        for _, token := range tokens {
            pending, ok := s.verify(formID, f.Key, token)
            if !ok {
                s.Discard(ctx, claim)
                return nil, ErrBadToken
            }
            final := EventPrefix(form.EventID) + uuid.NewString() + objectExt(pending)
            if err := s.Store.Copy(ctx, pending, final); err != nil {
                s.Discard(ctx, claim)
                return nil, ErrBadToken
            }
            claim.Keys = append(claim.Keys, final)
            keys = append(keys, final)
        }
        if f.multiple() {
            data[f.Key] = keys
        } else {
            data[f.Key] = keys[0]
        }
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

// DeleteFiles removes the files referenced by an applicant's data.
func (s *App) DeleteFiles(ctx context.Context, eventID string, data map[string]any) {
    for _, v := range data {
        for _, key := range tokensOf(v) {
            if !strings.HasPrefix(key, EventPrefix(eventID)) {
                continue
            }
            if err := s.Store.Delete(context.WithoutCancel(ctx), key); err != nil {
                slog.Warn("uploads: delete applicant file", "key", key, "error", err)
            }
        }
    }
}

// objectExt is a stored object's extension, keeping ".tar.gz" whole.
func objectExt(key string) string {
    if strings.HasSuffix(key, ".tar.gz") {
        return ".tar.gz"
    }
    return path.Ext(key)
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

// ApplicantFile returns an applicant's stored file for one field of an
// event; index picks one file of a multi-file field. The stored key must
// sit under the event's prefix.
func (s *App) ApplicantFile(ctx context.Context, eventID, applicantID, fieldKey string, index int) (string, error) {
    var value any
    err := s.DB.QueryRow(ctx, `
        SELECT a.data->$3 FROM applicants a
        JOIN event_applicants ea ON ea.user_id = a.id
        WHERE ea.event_id = $1::uuid AND ea.user_id = $2
    `, eventID, applicantID, fieldKey).Scan(&value)
    if err != nil {
        return "", postgres.MapPgError(err)
    }
    keys := tokensOf(value)
    if index < 0 || index >= len(keys) || !strings.HasPrefix(keys[index], EventPrefix(eventID)) {
        return "", postgres.ErrNotFound
    }
    return keys[index], nil
}

var remoteClient = &http.Client{Timeout: 10 * time.Second}

// StoreRemotePhoto downloads a Google profile picture (asking Google for a
// larger size), normalizes it like an uploaded photo and stores it for the
// event. Small pictures are accepted.
func (s *App) StoreRemotePhoto(ctx context.Context, eventID, pictureURL string) (string, error) {
    u, err := url.Parse(pictureURL)
    if err != nil || u.Scheme != "https" || !strings.HasSuffix(u.Hostname(), ".googleusercontent.com") {
        return "", errors.New("not a Google picture URL")
    }
    if i := strings.LastIndex(u.Path, "="); i >= 0 {
        u.Path = u.Path[:i] + "=s600-c"
    }
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
    if err != nil {
        return "", err
    }
    resp, err := remoteClient.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return "", fmt.Errorf("google picture: status %d", resp.StatusCode)
    }
    data, err := io.ReadAll(io.LimitReader(resp.Body, imageproc.MaxUploadBytes+1))
    if err != nil {
        return "", err
    }
    img, err := imageproc.Process(imageproc.Photo, data, 1, 1)
    if err != nil {
        return "", err
    }
    key := EventPrefix(eventID) + uuid.NewString() + "." + img.Ext
    if err := s.Store.Put(ctx, key, bytes.NewReader(img.Data), int64(len(img.Data)), img.ContentType); err != nil {
        return "", err
    }
    return key, nil
}

// CheckRequired reports a required upload field left empty, before money is
// taken for an application.
func (s *App) CheckRequired(ctx context.Context, formID string, data map[string]any) error {
    form, err := s.formImages(ctx, formID)
    if err != nil {
        return err
    }
    for _, f := range form.Fields {
        if f.Required && len(tokensOf(data[f.Key])) == 0 {
            return fmt.Errorf("%w: %s", ErrImageRequired, f.Label)
        }
    }
    return nil
}
