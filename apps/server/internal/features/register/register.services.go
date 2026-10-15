package register

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "time"

    "github.com/google/uuid"

    "identitycard-server/internal/features/applicants"
    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/entitlements"
    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrInvalidEventFormID = errors.New("invalid event form id")
    ErrFormNotFound       = errors.New("registration form not found")
    ErrFormNotLive        = errors.New("registration form is not live")
    ErrFormExpired        = errors.New("registration deadline has passed")
    ErrFormLimitReached   = errors.New("registration capacity is full")
    ErrDataPayloadTooLarge = errors.New("form data payload exceeds 64KB maximum limit")
)

const maxPayloadBytes = 64 * 1024

func (s *App) GetPublicApplyConfigService(ctx context.Context, eventFormID string) (*PublicApplyConfigResponse, error) {
    if _, err := uuid.Parse(eventFormID); err != nil {
        return nil, ErrInvalidEventFormID
    }

    cacheKey := fmt.Sprintf("cache:public_apply:config:%s", eventFormID)
    return cache.RememberWithJitter(ctx, s.Cache, cacheKey, 60*time.Second, cache.DefaultJitterPercentage, func() (*PublicApplyConfigResponse, error) {
        res, err := s.GetPublicApplyConfigRepository(ctx, eventFormID)
        if err != nil {
            if errors.Is(err, postgres.ErrNotFound) {
                return nil, ErrFormNotFound
            }
            return nil, err
        }
        if res == nil || res.EventFormID == "" {
            return nil, ErrFormNotFound
        }

        // If form is not live, expired, or full, nullify the form schema
        if res.Status != "live" || res.IsExpired || res.IsFull {
            res.Form = nil
        }

        return res, nil
    })
}

// SubmitApplicationService checks the form is open, then registers through
// the same capped insert as the dashboard (applicants.InsertApplicant).
func (s *App) SubmitApplicationService(ctx context.Context, eventFormID string, req SubmitApplicationRequest) (*SubmitApplicationResponse, error) {
    if _, err := uuid.Parse(eventFormID); err != nil {
        return nil, ErrInvalidEventFormID
    }

    if raw, err := json.Marshal(req.Data); err == nil && len(raw) > maxPayloadBytes {
        return nil, ErrDataPayloadTooLarge
    }

    cfg, err := s.GetPublicApplyConfigService(ctx, eventFormID)
    if err != nil {
        return nil, err
    }
    if cfg == nil || cfg.Event == nil {
        return nil, ErrFormNotFound
    }
    if cfg.Status != "live" {
        return nil, ErrFormNotLive
    }
    if cfg.IsExpired || time.Now().After(cfg.ExpiresAt) {
        return nil, ErrFormExpired
    }

    applicant, err := s.Applicants.InsertApplicant(ctx, cfg.Event.ID, applicants.CreateApplicantRequest{
        Name:  req.Name,
        Email: req.Email,
        Phone: req.Phone,
        Data:  req.Data,
    }, cfg.MaxApplicants)
    if err != nil {
        switch {
        case errors.Is(err, applicants.ErrLimitReached):
            return nil, ErrFormLimitReached
        case errors.Is(err, entitlements.ErrReadOnly):
            return nil, ErrFormExpired
        }
        return nil, err
    }

    s.Applicants.InvalidateCaches(ctx, cfg.Event.ID)
    return &SubmitApplicationResponse{
        UserID:    applicant.UserID,
        Status:    "submitted",
        Message:   "Application submitted successfully",
        CreatedAt: applicant.CreatedAt.UTC().Format(time.RFC3339),
    }, nil
}
