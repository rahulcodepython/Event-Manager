package register

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "strings"
    "time"

    "github.com/google/uuid"
    "github.com/jackc/pgx/v5"

    "identitycard-server/internal/features/applicants"
    "identitycard-server/internal/features/subevents"
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
    ErrSubEventLinkClosed  = errors.New("this sub-event link is not open")
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

    if req.SubEventLink != "" && !linkEnabled(cfg, req.SubEventLink) {
        return nil, ErrSubEventLinkClosed
    }
    if req.Data == nil {
        req.Data = map[string]interface{}{}
    }
    // Swap image tokens for the stored images (deleted again on failure).
    claim, err := s.Uploads.ClaimImages(ctx, eventFormID, req.Data)
    if err != nil {
        return nil, err
    }

    var (
        applicantID  string
        createdAt    = time.Now()
        enrolledOnly bool
    )
    err = postgres.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
        applicant, err := s.Applicants.InsertApplicantTx(ctx, tx, cfg.Event.ID, applicants.CreateApplicantRequest{
            Name:  req.Name,
            Email: req.Email,
            Phone: req.Phone,
            Data:  req.Data,
        }, cfg.MaxApplicants)
        switch {
        case err == nil:
            applicantID, createdAt = applicant.UserID, applicant.CreatedAt
        case errors.Is(err, applicants.ErrAlreadyRegistered) && req.SubEventLink != "":
            // One applicant per email: a sub-event link enrolls them.
            applicantID, err = s.Applicants.FindByEmailTx(ctx, tx, cfg.Event.ID, strings.ToLower(strings.TrimSpace(req.Email)))
            if err != nil {
                return err
            }
            enrolledOnly = true
        default:
            return err
        }

        ids := req.SubEventIDs
        if req.SubEventLink != "" {
            ids = []string{req.SubEventLink}
        }
        return subevents.EnrollTx(ctx, tx, cfg.Event.ID, applicantID, ids, &subevents.SelfRules{
            Mode:     cfg.SubEvents.Mode,
            Required: cfg.SubEvents.Required,
            Fixed:    req.SubEventLink != "",
        })
    })
    if err != nil || enrolledOnly {
        // An existing applicant keeps their data; new images are unused.
        s.Uploads.Discard(ctx, claim)
    }
    if err != nil {
        switch {
        case errors.Is(err, applicants.ErrLimitReached):
            return nil, ErrFormLimitReached
        case errors.Is(err, entitlements.ErrReadOnly), errors.Is(err, entitlements.ErrApplicationsClosed):
            return nil, ErrFormExpired
        }
        return nil, err
    }

    s.Applicants.InvalidateCaches(ctx, cfg.Event.ID)
    res := &SubmitApplicationResponse{
        UserID:    applicantID,
        Status:    "submitted",
        Message:   "Application submitted successfully",
        CreatedAt: createdAt.UTC().Format(time.RFC3339),
    }
    if enrolledOnly {
        res.Status = "enrolled"
        res.Message = "You were already registered; you are now enrolled in this sub-event"
    }
    return res, nil
}

// linkEnabled reports whether the sub-event belongs to the form's event and
// has its public link turned on.
func linkEnabled(cfg *PublicApplyConfigResponse, subEventID string) bool {
    for _, o := range cfg.SubEvents.Options {
        if o.ID == subEventID {
            return o.LinkEnabled
        }
    }
    return false
}
