package forms

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "strings"
    "time"

    "github.com/google/uuid"

    "identitycard-server/internal/generic"
    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrInvalidFormID          = errors.New("invalid form id")
    ErrFormNotFound           = errors.New("form not found")
    ErrInvalidFormName        = errors.New("form name cannot be empty")
    ErrMissingMandatoryFields = errors.New("mandatory fields (name and email) cannot be removed")
    ErrInvalidFieldType       = errors.New("unsupported field type")
)

// ListService retrieves paginated form templates with TTL jitter caching.
func (s *App) ListService(ctx context.Context, orgID, search string, page, limit int) (*generic.PaginatedResponse[[]Form], error) {
    search = strings.TrimSpace(search)
    offset := (page - 1) * limit

    cacheKey := fmt.Sprintf("cache:forms:list:o=%s:s=%s:p=%d:l=%d", orgID, search, page, limit)
    return cache.RememberWithJitter(ctx, s.Cache, cacheKey, 5*time.Minute, cache.DefaultJitterPercentage, func() (*generic.PaginatedResponse[[]Form], error) {
        return s.ListRepository(ctx, orgID, search, page, limit, offset)
    })
}

// GetService finds a form by UUID with TTL jitter caching.
func (s *App) GetService(ctx context.Context, id string) (*Form, error) {
    if _, err := uuid.Parse(id); err != nil {
        return nil, ErrInvalidFormID
    }

    cacheKey := fmt.Sprintf("cache:forms:detail:%s", id)
    return cache.RememberWithJitter(ctx, s.Cache, cacheKey, 10*time.Minute, cache.DefaultJitterPercentage, func() (*Form, error) {
        f, err := s.GetRepository(ctx, id)
        if err != nil {
            if errors.Is(err, postgres.ErrNotFound) {
                return nil, ErrFormNotFound
            }
            return nil, err
        }
        return f, nil
    })
}

// CreateService validates name and initializes form with default system fields.
func (s *App) CreateService(ctx context.Context, orgID string, req CreateFormRequest) (*Form, error) {
    trimmedName := strings.TrimSpace(req.Name)
    if trimmedName == "" {
        return nil, ErrInvalidFormName
    }

    defaultFields := DefaultFormFields()
    fieldsJSON, err := json.Marshal(defaultFields)
    if err != nil {
        return nil, err
    }

    f, err := s.CreateRepository(ctx, orgID, trimmedName, fieldsJSON)
    if err != nil {
        return nil, err
    }

    if s.Cache != nil {
        _ = s.Cache.DeletePattern(ctx, fmt.Sprintf("cache:forms:list:o=%s:*", orgID))
    }

    return f, nil
}

// UpdateService updates form metadata (name) and invalidates cache.
func (s *App) UpdateService(ctx context.Context, id string, req UpdateFormRequest) (*Form, error) {
    if _, err := uuid.Parse(id); err != nil {
        return nil, ErrInvalidFormID
    }

    if req.Name != nil {
        trimmed := strings.TrimSpace(*req.Name)
        if trimmed == "" {
            return nil, ErrInvalidFormName
        }
        req.Name = &trimmed
    }

    f, err := s.UpdateRepository(ctx, id, req)
    if err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            return nil, ErrFormNotFound
        }
        return nil, err
    }

    if s.Cache != nil {
        _ = s.Cache.Delete(ctx, fmt.Sprintf("cache:forms:detail:%s", id))
        _ = s.Cache.DeletePattern(ctx, "cache:forms:list:*")
    }

    return f, nil
}

// UpdateFieldsService validates all field types and ensures mandatory fields remain intact.
func (s *App) UpdateFieldsService(ctx context.Context, id string, req UpdateFormFieldsRequest) (*Form, error) {
    if _, err := uuid.Parse(id); err != nil {
        return nil, ErrInvalidFormID
    }

    hasName := false
    hasEmail := false
    hasPhone := false

    normalizedFields := make([]FormField, len(req.Fields))
    for i, field := range req.Fields {
        if !SupportedFieldTypes[field.Type] {
            return nil, ErrInvalidFieldType
        }

        if field.ID == "" {
            field.ID = uuid.NewString()
        }

        if field.Key == "name" || (field.IsSystem && field.Type == "text") {
            hasName = true
            field.IsSystem = true
            field.Required = true
            field.Key = "name"
        }

        if field.Key == "email" || (field.IsSystem && field.Type == "email") {
            hasEmail = true
            field.IsSystem = true
            field.Required = true
            field.Key = "email"
        }

        if field.Key == "phone" || (field.IsSystem && field.Type == "phone") {
            hasPhone = true
            field.IsSystem = true
            field.Required = true
            field.Key = "phone"
            field.Type = "phone"
            if field.Validation == nil {
                field.Validation = &FieldValidation{
                    MinLength: intPtr(10),
                    MaxLength: intPtr(10),
                }
            } else {
                field.Validation.MinLength = intPtr(10)
                field.Validation.MaxLength = intPtr(10)
            }
        }

        if field.Options == nil {
            field.Options = []FieldOption{}
        }

        normalizedFields[i] = field
    }

    if !hasName || !hasEmail || !hasPhone {
        return nil, ErrMissingMandatoryFields
    }

    fieldsJSON, err := json.Marshal(normalizedFields)
    if err != nil {
        return nil, err
    }

    f, err := s.UpdateFieldsRepository(ctx, id, fieldsJSON)
    if err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            return nil, ErrFormNotFound
        }
        return nil, err
    }

    if s.Cache != nil {
        _ = s.Cache.Delete(ctx, fmt.Sprintf("cache:forms:detail:%s", id))
    }

    return f, nil
}

// DeleteService removes a form by UUID and invalidates cache.
func (s *App) DeleteService(ctx context.Context, id string) error {
    if _, err := uuid.Parse(id); err != nil {
        return ErrInvalidFormID
    }

    err := s.DeleteRepository(ctx, id)
    if err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            return ErrFormNotFound
        }
        return err
    }

    if s.Cache != nil {
        _ = s.Cache.Delete(ctx, fmt.Sprintf("cache:forms:detail:%s", id))
        _ = s.Cache.DeletePattern(ctx, "cache:forms:list:*")
    }

    return nil
}
