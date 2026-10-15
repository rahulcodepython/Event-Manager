package applicants

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "strings"
    "time"

    "github.com/google/uuid"
    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/utils"
)

var (
    ErrInvalidEventID     = errors.New("invalid event id")
    ErrInvalidName        = errors.New("name cannot be empty")
    ErrInvalidEmail       = errors.New("valid email address is required")
    ErrInvalidPhone       = errors.New("mobile number is required")
    ErrAlreadyRegistered  = errors.New("an applicant with this email is already registered for this event")
    ErrApplicantNotFound  = errors.New("applicant not found")
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

func (s *App) insertApplicant(ctx context.Context, eventID string, req CreateApplicantRequest) (*ApplicantItem, error) {
    req, err := normalizeApplicant(req)
    if err != nil {
        return nil, err
    }

    dataJSON, err := json.Marshal(req.Data)
    if err != nil {
        return nil, err
    }

    userID := utils.GenerateApplicantUserID(eventID)
    created, err := s.CreateApplicantRepository(ctx, eventID, userID, req.Name, req.Email, req.Phone, dataJSON)
    // The insert query returns no row when the email is already registered.
    if errors.Is(err, postgres.ErrConflict) || errors.Is(err, postgres.ErrNotFound) || (err == nil && created == nil) {
        return nil, ErrAlreadyRegistered
    }
    return created, err
}

func (s *App) invalidateApplicantCaches(ctx context.Context, eventID string) {
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

    created, err := s.insertApplicant(ctx, eventID, req)
    if err != nil {
        return nil, err
    }

    s.invalidateApplicantCaches(ctx, eventID)
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

    res := &BulkCreateApplicantsResponse{Failed: []BulkApplicantError{}}
    for i, req := range reqs {
        if _, err := s.insertApplicant(ctx, eventID, req); err != nil {
            res.Failed = append(res.Failed, BulkApplicantError{Row: i + 1, Email: req.Email, Error: err.Error()})
            continue
        }
        res.Created++
    }

    if res.Created > 0 {
        s.invalidateApplicantCaches(ctx, eventID)
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

    if err := s.DeleteApplicantRepository(ctx, eventID, userID); err != nil {
        return nil, err
    }

    s.invalidateApplicantCaches(ctx, eventID)

    return &DeleteApplicantResponse{
        UserID:  userID,
        Message: "Applicant deleted successfully",
    }, nil
}
