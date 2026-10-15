package pricing

import (
    "context"
    "errors"
    "fmt"
    "time"

    "identitycard-server/internal/pkg/cache"
)

const catalogCacheKey = "cache:pricing:catalog"

var (
    ErrUnknownFeature = errors.New("unknown feature")
    ErrInvalidValue   = errors.New("value is not one of the feature's options")
    ErrDuplicateKey   = errors.New("feature selected more than once")
)

func (s *App) loadCatalog(ctx context.Context) (*catalog, error) {
    return cache.RememberWithJitter(ctx, s.Cache, catalogCacheKey, 5*time.Minute, cache.DefaultJitterPercentage, func() (*catalog, error) {
        return s.GetCatalogRepository(ctx)
    })
}

// InvalidateCatalog drops the cached catalog after admin edits.
func (s *App) InvalidateCatalog(ctx context.Context) {
    if s.Cache != nil {
        _ = s.Cache.Delete(ctx, catalogCacheKey)
    }
}

// CatalogService returns every active feature with the price of each option.
func (s *App) CatalogService(ctx context.Context) (*CatalogResponse, error) {
    c, err := s.loadCatalog(ctx)
    if err != nil {
        return nil, err
    }

    res := &CatalogResponse{
        Currency:  c.Currency,
        BaseFee:   c.BaseFee,
        TaxName:   c.TaxName,
        TaxRateBP: c.TaxRateBP,
        TrialMaxEventDays: c.TrialMaxEventDays,
        Features:  make([]CatalogFeature, 0, len(c.Features)),
    }
    for _, f := range c.Features {
        options := make([]CatalogOption, 0, len(f.Options))
        for _, o := range f.Options {
            options = append(options, CatalogOption{Value: o.Value, Label: o.Label, Price: featurePrice(f, o.Value)})
        }
        res.Features = append(res.Features, CatalogFeature{
            ID:           f.ID,
            Key:          f.Key,
            Name:         f.Name,
            Description:  f.Description,
            ValueType:    f.ValueType,
            Unit:         f.Unit,
            DefaultValue: f.DefaultValue,
            TrialValue:   f.TrialValue,
            Options:      options,
        })
    }
    return res, nil
}

// QuoteService prices a set of feature selections. Every active feature is
// priced; a feature left out uses its default value. This is the only place
// a payable amount is computed.
func (s *App) QuoteService(ctx context.Context, selections []Selection) (*Quote, error) {
    c, err := s.loadCatalog(ctx)
    if err != nil {
        return nil, err
    }

    chosen := make(map[string]int, len(selections))
    for _, sel := range selections {
        if _, dup := chosen[sel.Key]; dup {
            return nil, fmt.Errorf("%w: %s", ErrDuplicateKey, sel.Key)
        }
        chosen[sel.Key] = sel.Value
    }

    q := &Quote{
        Currency:  c.Currency,
        Lines:     make([]QuoteLine, 0, len(c.Features)),
        BaseFee:   c.BaseFee,
        Subtotal:  c.BaseFee,
        TaxName:   c.TaxName,
        TaxRateBP: c.TaxRateBP,
    }

    for _, f := range c.Features {
        value, ok := chosen[f.Key]
        if !ok {
            value = f.DefaultValue
        }
        delete(chosen, f.Key)

        label, valid := optionLabel(f, value)
        if !valid {
            return nil, fmt.Errorf("%w: %s = %d", ErrInvalidValue, f.Key, value)
        }

        amount := featurePrice(f, value)
        q.Lines = append(q.Lines, QuoteLine{
            FeatureID: f.ID,
            Key:       f.Key,
            Name:      f.Name,
            Value:     value,
            Label:     label,
            Amount:    amount,
        })
        q.Subtotal += amount
    }

    for key := range chosen {
        return nil, fmt.Errorf("%w: %s", ErrUnknownFeature, key)
    }

    q.Tax = taxOn(q.Subtotal, q.TaxRateBP)
    q.Total = q.Subtotal + q.Tax
    return q, nil
}

func optionLabel(f feature, value int) (string, bool) {
    for _, o := range f.Options {
        if o.Value == value {
            return o.Label, true
        }
    }
    return "", false
}
