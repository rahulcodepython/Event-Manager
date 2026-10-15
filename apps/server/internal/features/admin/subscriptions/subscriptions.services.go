package subscriptions

import (
    "context"
    "errors"
    "fmt"
    "strings"
    "time"

    "identitycard-server/internal/pkg/postgres"
)

var ErrInvalidSubscription = errors.New("invalid subscription")

func invalid(msg string) error {
    return fmt.Errorf("%w: %s", ErrInvalidSubscription, msg)
}

func (s *App) ListService(ctx context.Context) ([]Subscription, error) {
    return s.ListRepository(ctx)
}

func (s *App) CreateService(ctx context.Context, req SubscriptionRequest) (*Subscription, error) {
    if err := s.validate(ctx, &req); err != nil {
        return nil, err
    }
    id, err := s.CreateRepository(ctx, req)
    if err != nil {
        return nil, err
    }
    return s.GetRepository(ctx, id)
}

func (s *App) UpdateService(ctx context.Context, id string, req SubscriptionRequest) (*Subscription, error) {
    if err := s.validate(ctx, &req); err != nil {
        return nil, err
    }
    if err := s.UpdateRepository(ctx, id, req); err != nil {
        return nil, err
    }
    return s.GetRepository(ctx, id)
}

func (s *App) DeleteService(ctx context.Context, id string) error {
    ok, err := s.DeleteRepository(ctx, id)
    if err != nil {
        return err
    }
    if !ok {
        return postgres.ErrNotFound
    }
    return nil
}

// RenewService confirms the current renewal of an active subscription.
func (s *App) RenewService(ctx context.Context, id string, req RenewRequest) (*Subscription, error) {
    if req.Amount != nil && *req.Amount <= 0 {
        return nil, invalid("amount must be positive")
    }
    if req.PaidOn == "" {
        req.PaidOn = time.Now().Format(time.DateOnly)
    } else if _, err := time.Parse(time.DateOnly, req.PaidOn); err != nil {
        return nil, invalid("date must be YYYY-MM-DD")
    }
    if err := s.RenewRepository(ctx, id, req.Amount, req.PaidOn); err != nil {
        return nil, err
    }
    return s.GetRepository(ctx, id)
}

func (s *App) validate(ctx context.Context, req *SubscriptionRequest) error {
    req.Name = strings.TrimSpace(req.Name)
    req.Vendor = strings.TrimSpace(req.Vendor)
    req.Notes = strings.TrimSpace(req.Notes)
    switch {
    case req.Name == "":
        return invalid("name is required")
    case req.Amount <= 0:
        return invalid("amount must be positive")
    case req.IntervalMonths < 1 || req.IntervalMonths > 120:
        return invalid("interval must be between 1 and 120 months")
    }
    if _, err := time.Parse(time.DateOnly, req.NextDueOn); err != nil {
        return invalid("next due date must be YYYY-MM-DD")
    }
    if req.CategoryID != nil && *req.CategoryID == "" {
        req.CategoryID = nil
    }
    if req.CategoryID != nil {
        kind, err := s.GetCategoryKindRepository(ctx, *req.CategoryID)
        if errors.Is(err, postgres.ErrNotFound) {
            return invalid("category not found")
        }
        if err != nil {
            return err
        }
        if kind != "expense" {
            return invalid("subscriptions need an expense category")
        }
    }
    return nil
}
