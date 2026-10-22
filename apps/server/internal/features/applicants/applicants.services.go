package applicants

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "strings"
    "time"

    "github.com/google/uuid"
    "github.com/jackc/pgx/v5"
    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/entitlements"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/utils"
)

var (
    ErrInvalidEventID     = errors.New("invalid event id")
    ErrInvalidName        = errors.New("name cannot be empty")
    ErrInvalidEmail       = errors.New("valid email address is required")
    ErrInvalidPhone       = errors.New("mobile number is required")
    // ErrInvalidOption: a select, radio or checkbox answer that is not one
    // of the field's options.
    ErrInvalidOption = errors.New("invalid choice")
    ErrAlreadyRegistered  = errors.New("an applicant with this email is already registered for this event")
    ErrApplicantNotFound  = errors.New("applicant not found")
    ErrLimitReached       = errors.New("applicant limit of this event's credit reached")
    ErrApplicantPaid      = errors.New("this applicant paid an application fee: refund them instead")
)

func (s *App) ListApplicantsService(ctx context.Context, eventID, search string, filters []ApplicantFilter, page, limit int) (*ListApplicantsResponse, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }

    form, err := s.GetAssignedFormRepository(ctx, eventID)
    if err != nil && !errors.Is(err, postgres.ErrNotFound) {
        return nil, err
    }

    fieldMap := make(map[string]FormFieldItem)
    if form != nil {
        for _, f := range form.Fields {
            fieldMap[f.Key] = f
        }
    }

    args := []any{eventID}
    whereClauses := []string{"ea.event_id = $1"}

    search = strings.TrimSpace(search)
    if search != "" {
        args = append(args, search)
        paramIdx := len(args)
        whereClauses = append(whereClauses, fmt.Sprintf("(a.name ILIKE '%%' || $%d || '%%' OR a.email ILIKE '%%' || $%d || '%%' OR a.phone ILIKE '%%' || $%d || '%%' OR a.id ILIKE '%%' || $%d || '%%' OR a.data::text ILIKE '%%' || $%d || '%%')", paramIdx, paramIdx, paramIdx, paramIdx, paramIdx))
    }

    whereClauses, args = buildApplicantFilterClauses(filters, fieldMap, whereClauses, args)

    offset := (page - 1) * limit
    args = append(args, limit, offset, page, limit)
    limitIdx := len(args) - 3
    offsetIdx := len(args) - 2
    pageIdx := len(args) - 1
    limitIdx2 := len(args)

    whereClauseStr := strings.Join(whereClauses, " AND ")

    paginated, err := s.QueryApplicantsWithFiltersRepository(ctx, whereClauseStr, limitIdx, offsetIdx, pageIdx, limitIdx2, args...)
    if err != nil {
        return nil, err
    }

    return &ListApplicantsResponse{
        Data:  paginated.Data,
        Total: paginated.Total,
        Page:  paginated.Page,
        Limit: paginated.Limit,
        Form:  nil,
    }, nil
}

func (s *App) GetApplicantSchemaService(ctx context.Context, eventID string) (*FormSummary, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }

    cacheKey := fmt.Sprintf("cache:applicant_schema:e=%s", eventID)
    return cache.RememberWithJitter(ctx, s.Cache, cacheKey, 5*time.Minute, cache.DefaultJitterPercentage, func() (*FormSummary, error) {
        form, err := s.GetAssignedFormRepository(ctx, eventID)
        if err != nil && !errors.Is(err, postgres.ErrNotFound) {
            return nil, err
        }
        return form, nil
    })
}

const maxBulkApplicants = 1000

var ErrBulkLimit = fmt.Errorf("between 1 and %d applicants can be uploaded at once", maxBulkApplicants)

// normalizeApplicant trims and validates one applicant payload.
func normalizeApplicant(req CreateApplicantRequest) (CreateApplicantRequest, error) {
    req.Name = strings.TrimSpace(req.Name)
    if req.Name == "" {
        return req, ErrInvalidName
    }

    req.Email = strings.ToLower(strings.TrimSpace(req.Email))
    if req.Email == "" || !strings.Contains(req.Email, "@") {
        return req, ErrInvalidEmail
    }

    req.Phone = strings.TrimSpace(req.Phone)
    if req.Phone == "" {
        for _, key := range []string{"phone", "mobile"} {
            if p, ok := req.Data[key].(string); ok && strings.TrimSpace(p) != "" {
                req.Phone = strings.TrimSpace(p)
                break
            }
        }
    }
    if req.Phone == "" {
        return req, ErrInvalidPhone
    }

    if req.Data == nil {
        req.Data = make(map[string]interface{})
    }
    return req, nil
}

// InsertApplicant validates and registers one applicant. It is the only
// write path for applicants (dashboard, bulk upload, public form), so the
// credit's applicant limit always holds. extraCap further limits the count
// (e.g. the public form's capacity); pass -1 for none.
func (s *App) InsertApplicant(ctx context.Context, eventID string, req CreateApplicantRequest, extraCap int) (*ApplicantItem, error) {
    var item *ApplicantItem
    err := postgres.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
        var err error
        item, err = s.InsertApplicantTx(ctx, tx, eventID, req, extraCap)
        return err
    })
    return item, err
}

// InsertApplicantTx is InsertApplicant inside the caller's transaction, so
// related writes (e.g. sub-event enrollment) commit with the applicant.
func (s *App) InsertApplicantTx(ctx context.Context, tx pgx.Tx, eventID string, req CreateApplicantRequest, extraCap int) (*ApplicantItem, error) {
    req, err := normalizeApplicant(req)
    if err != nil {
        return nil, err
    }
    if err := checkChoices(ctx, tx, eventID, req.Data); err != nil {
        return nil, err
    }

    dataJSON, err := json.Marshal(req.Data)
    if err != nil {
        return nil, err
    }

    userID := utils.GenerateApplicantUserID(eventID)
    res, err := s.CreateApplicantTx(ctx, tx, eventID, userID, req.Name, req.Email, req.Phone, dataJSON, extraCap)
    if errors.Is(err, postgres.ErrConflict) {
        return nil, ErrAlreadyRegistered
    }
    if err != nil {
        return nil, err
    }

    switch res.Status {
    case "ok":
        return res.Applicant, nil
    case "already_registered":
        return nil, ErrAlreadyRegistered
    case "limit_reached":
        return nil, ErrLimitReached
    case "expired":
        return nil, entitlements.ErrReadOnly
    case "window_closed":
        return nil, entitlements.ErrApplicationsClosed
    default:
        return nil, ErrInvalidEventID
    }
}

// InvalidateCaches drops cached data that includes the event's applicant count.
func (s *App) InvalidateCaches(ctx context.Context, eventID string) {
    if s.Cache == nil {
        return
    }
    _ = s.Cache.DeletePattern(ctx, fmt.Sprintf("cache:event_forms:event:%s*", eventID))
    _ = s.Cache.DeletePattern(ctx, fmt.Sprintf("cache:applicant_schema:e=%s*", eventID))
    _ = s.Cache.DeletePattern(ctx, "cache:public_apply:*")
}

func (s *App) CreateApplicantService(ctx context.Context, eventID string, req CreateApplicantRequest) (*ApplicantItem, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }

    created, err := s.InsertApplicant(ctx, eventID, req, -1)
    if err != nil {
        return nil, err
    }

    s.InvalidateCaches(ctx, eventID)
    return created, nil
}

// BulkCreateApplicantsService inserts each applicant independently; a bad row
// is reported back instead of failing the whole upload.
func (s *App) BulkCreateApplicantsService(ctx context.Context, eventID string, reqs []CreateApplicantRequest) (*BulkCreateApplicantsResponse, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }
    if len(reqs) == 0 || len(reqs) > maxBulkApplicants {
        return nil, ErrBulkLimit
    }
    if err := entitlements.RequireApplicationsOpen(ctx, s.DB, eventID); err != nil {
        return nil, err
    }

    res := &BulkCreateApplicantsResponse{Failed: []BulkApplicantError{}}
    for i, req := range reqs {
        if _, err := s.InsertApplicant(ctx, eventID, req, -1); err != nil {
            res.Failed = append(res.Failed, BulkApplicantError{Row: i + 1, Email: req.Email, Error: err.Error()})
            continue
        }
        res.Created++
    }

    if res.Created > 0 {
        s.InvalidateCaches(ctx, eventID)
    }
    return res, nil
}

func (s *App) DeleteApplicantService(ctx context.Context, eventID, userID string) (*DeleteApplicantResponse, error) {
    if _, err := uuid.Parse(eventID); err != nil {
        return nil, ErrInvalidEventID
    }
    userID = strings.TrimSpace(userID)
    if userID == "" {
        return nil, ErrApplicantNotFound
    }
    if err := entitlements.RequireApplicationsOpen(ctx, s.DB, eventID); err != nil {
        return nil, err
    }
    // Paid applicants leave through a refund, so the fee goes back too.
    var paid bool
    if err := s.DB.QueryRow(ctx, `
        SELECT EXISTS (SELECT 1 FROM application_drafts
                       WHERE event_id = $1::uuid AND applicant_id = $2 AND status = 'confirmed' AND amount > 0)
    `, eventID, userID).Scan(&paid); err != nil {
        return nil, err
    }
    if paid {
        return nil, ErrApplicantPaid
    }

    var data map[string]any
    _ = s.DB.QueryRow(ctx, `SELECT data FROM applicants WHERE id = $1`, userID).Scan(&data)

    if err := s.DeleteApplicantRepository(ctx, eventID, userID); err != nil {
        return nil, err
    }
    for _, hook := range s.OnDelete {
        hook(ctx, eventID, data)
    }

    s.InvalidateCaches(ctx, eventID)

    return &DeleteApplicantResponse{
        UserID:  userID,
        Message: "Applicant deleted successfully",
    }, nil
}

// Validate checks an applicant's name, email and phone without saving.
func Validate(req CreateApplicantRequest) error {
    _, err := normalizeApplicant(req)
    return err
}

// RemoveApplicant deletes an applicant regardless of the application window
// (used when a paid registration is refunded) and runs the delete hooks.
func (s *App) RemoveApplicant(ctx context.Context, eventID, userID string) error {
    var data map[string]any
    _ = s.DB.QueryRow(ctx, `SELECT data FROM applicants WHERE id = $1`, userID).Scan(&data)
    if err := s.DeleteApplicantRepository(ctx, eventID, userID); err != nil {
        return err
    }
    for _, hook := range s.OnDelete {
        hook(ctx, eventID, data)
    }
    s.InvalidateCaches(ctx, eventID)
    return nil
}

// choiceField is a select, radio or checkbox field of the event's form.
type choiceField struct {
    Key     string            `json:"key"`
    Label   string            `json:"label"`
    Type    string            `json:"type"`
    Options []json.RawMessage `json:"options"`
}

// optionValue reads an option stored as "value" or {"value": ..., "label": ...}.
func optionValue(raw json.RawMessage) string {
    var s string
    if json.Unmarshal(raw, &s) == nil {
        return s
    }
    var o struct {
        Value any `json:"value"`
    }
    if json.Unmarshal(raw, &o) == nil && o.Value != nil {
        return fmt.Sprint(o.Value)
    }
    return ""
}

// checkChoices rejects select, radio and checkbox answers that are not
// options of the event form's field. Empty answers are left to the
// required-field checks.
func checkChoices(ctx context.Context, tx pgx.Tx, eventID string, data map[string]any) error {
    var fields []choiceField
    err := tx.QueryRow(ctx, `
        SELECT COALESCE(jsonb_agg(f), '[]'::jsonb) FROM event_forms ef, jsonb_array_elements(ef.fields) f
        WHERE ef.event_id = $1::uuid AND f->>'type' IN ('select', 'radio', 'checkbox')
    `, eventID).Scan(&fields)
    if err != nil {
        return postgres.MapPgError(err)
    }
    for _, f := range fields {
        allowed := make(map[string]bool, len(f.Options))
        for _, o := range f.Options {
            allowed[optionValue(o)] = true
        }
        var picked []string
        switch v := data[f.Key].(type) {
        case nil:
        case string:
            if v != "" {
                picked = []string{v}
            }
        case []any:
            for _, x := range v {
                picked = append(picked, fmt.Sprint(x))
            }
        default:
            return fmt.Errorf("%w: %s", ErrInvalidOption, f.Label)
        }
        if f.Type != "checkbox" && len(picked) > 1 {
            return fmt.Errorf("%w: %s takes one answer", ErrInvalidOption, f.Label)
        }
        for _, p := range picked {
            if !allowed[p] {
                return fmt.Errorf("%w: %q is not an option of %s", ErrInvalidOption, p, f.Label)
            }
        }
    }
    return nil
}
