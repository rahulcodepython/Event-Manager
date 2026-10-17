package catalog

import (
    "context"
    "errors"
    "fmt"
    "strings"
)

var ErrInvalidCatalog = errors.New("invalid catalog")

func invalid(format string, args ...any) error {
    return fmt.Errorf("%w: %s", ErrInvalidCatalog, fmt.Sprintf(format, args...))
}

func (s *App) GetCatalogService(ctx context.Context) (*Catalog, error) {
    return s.GetCatalogRepository(ctx)
}

func (s *App) UpdateSettingsService(ctx context.Context, req UpdateSettingsRequest) (*Catalog, error) {
    req.TaxName = strings.TrimSpace(req.TaxName)
    switch {
    case req.BaseFee < 0:
        return nil, invalid("base fee cannot be negative")
    case req.TaxName == "":
        return nil, invalid("tax name is required")
    case req.TaxRateBP < 0 || req.TaxRateBP > 10000:
        return nil, invalid("tax rate must be between 0%% and 100%%")
    case req.TrialMaxEventDays < 1:
        return nil, invalid("trial event length must be at least 1 day")
    }
    if err := s.UpdateSettingsRepository(ctx, req); err != nil {
        return nil, err
    }
    s.Pricing.InvalidateCatalog(ctx)
    return s.GetCatalogRepository(ctx)
}

// UpdateFeatureService validates and saves one feature. Credits already
// bought keep the values and prices copied at purchase.
func (s *App) UpdateFeatureService(ctx context.Context, featureID string, req UpdateFeatureRequest) (*Catalog, error) {
    valueType, err := s.GetValueTypeRepository(ctx, featureID)
    if err != nil {
        return nil, err
    }
    if err := validateFeature(valueType, &req); err != nil {
        return nil, err
    }
    if err := s.UpdateFeatureRepository(ctx, featureID, req); err != nil {
        return nil, err
    }
    s.Pricing.InvalidateCatalog(ctx)
    return s.GetCatalogRepository(ctx)
}

func validateFeature(valueType string, req *UpdateFeatureRequest) error {
    req.Name = strings.TrimSpace(req.Name)
    req.Description = strings.TrimSpace(req.Description)
    req.Unit = strings.TrimSpace(req.Unit)
    if req.Name == "" {
        return invalid("name is required")
    }
    switch req.PricingType {
    case "flat", "per_unit", "tiered":
    default:
        return invalid("pricing type must be flat, per_unit or tiered")
    }

    if len(req.Options) == 0 {
        return invalid("at least one option is required")
    }
    seen := map[int]bool{}
    defaultActive := false
    for i := range req.Options {
        o := &req.Options[i]
        o.Label = strings.TrimSpace(o.Label)
        switch {
        case o.Value < 0:
            return invalid("option values cannot be negative")
        case valueType == "boolean" && o.Value > 1:
            return invalid("on/off features only take 0 or 1")
        case o.Label == "":
            return invalid("every option needs a label")
        case seen[o.Value]:
            return invalid("option value %d is listed twice", o.Value)
        }
        seen[o.Value] = true
        if o.Value == req.DefaultValue && o.IsActive {
            defaultActive = true
        }
    }
    if !defaultActive {
        return invalid("the default value must be one of the active options")
    }
    if req.TrialValue < 0 || (valueType == "boolean" && req.TrialValue > 1) {
        return invalid("invalid trial value")
    }

    for _, r := range req.Rates {
        switch {
        case r.MinValue < 0:
            return invalid("rate minimum cannot be negative")
        case r.MaxValue != nil && *r.MaxValue < r.MinValue:
            return invalid("rate maximum must be at least its minimum")
        case r.UnitSize < 1:
            return invalid("rate unit size must be at least 1")
        case r.Price < 0:
            return invalid("rate price cannot be negative")
        }
    }
    return nil
}
