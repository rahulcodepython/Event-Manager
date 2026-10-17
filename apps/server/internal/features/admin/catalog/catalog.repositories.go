package catalog

import (
    "context"

    "github.com/jackc/pgx/v5"

    "identitycard-server/internal/pkg/postgres"
)

func (r *App) GetCatalogRepository(ctx context.Context) (*Catalog, error) {
    return postgres.QueryJSON[Catalog](ctx, r.DB, GetCatalogQuery)
}

func (r *App) UpdateSettingsRepository(ctx context.Context, req UpdateSettingsRequest) error {
    return postgres.Exec(ctx, r.DB, UpdateSettingsQuery, req.BaseFee, req.TaxName, req.TaxRateBP, req.TrialMaxEventDays)
}

func (r *App) GetValueTypeRepository(ctx context.Context, featureID string) (string, error) {
    var valueType string
    err := r.DB.QueryRow(ctx, GetValueTypeQuery, featureID).Scan(&valueType)
    return valueType, postgres.MapPgError(err)
}

// UpdateFeatureRepository replaces the feature row, its options and its
// rates in one transaction.
func (r *App) UpdateFeatureRepository(ctx context.Context, featureID string, req UpdateFeatureRequest) error {
    return postgres.WithTx(ctx, r.DB, func(tx pgx.Tx) error {
        if err := postgres.Exec(ctx, tx, UpdateFeatureQuery, featureID, req.Name, req.Description, req.Unit, req.PricingType, req.DefaultValue, req.TrialValue); err != nil {
            return err
        }
        if err := postgres.Exec(ctx, tx, DeleteOptionsQuery, featureID); err != nil {
            return err
        }
        for i, o := range req.Options {
            if err := postgres.Exec(ctx, tx, InsertOptionQuery, featureID, o.Value, o.Label, o.IsActive, i+1); err != nil {
                return err
            }
        }
        if err := postgres.Exec(ctx, tx, DeleteRatesQuery, featureID); err != nil {
            return err
        }
        for _, rt := range req.Rates {
            if err := postgres.Exec(ctx, tx, InsertRateQuery, featureID, rt.MinValue, rt.MaxValue, rt.UnitSize, rt.Price); err != nil {
                return err
            }
        }
        return nil
    })
}
