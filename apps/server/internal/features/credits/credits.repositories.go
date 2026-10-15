package credits

import (
    "context"
    "encoding/json"

    "identitycard-server/internal/features/pricing"
    "identitycard-server/internal/generic"
    "identitycard-server/internal/pkg/postgres"
)

func (r *App) ListCreditsRepository(ctx context.Context, orgID string) ([]Credit, error) {
    list, err := postgres.QueryJSON[[]Credit](ctx, r.DB, ListCreditsQuery, orgID)
    if err != nil || list == nil {
        return []Credit{}, err
    }
    return *list, nil
}

func (r *App) RenameCreditRepository(ctx context.Context, creditID, name string) (*Credit, error) {
    return postgres.QueryJSON[Credit](ctx, r.DB, RenameCreditQuery, creditID, name)
}

// ClaimTrialRepository returns ErrNotFound if the trial was already decided.
func (r *App) ClaimTrialRepository(ctx context.Context, orgID string) (string, error) {
    var id string
    err := r.DB.QueryRow(ctx, ClaimTrialQuery, orgID, generic.FeatureKeyDuration).Scan(&id)
    return id, postgres.MapPgError(err)
}

func (r *App) SkipTrialRepository(ctx context.Context, orgID string) error {
    return postgres.Exec(ctx, r.DB, SkipTrialQuery, orgID)
}

func (r *App) InsertPaymentRepository(ctx context.Context, orgID, name string, quote *pricing.Quote, orderID string) error {
    raw, err := json.Marshal(quote)
    if err != nil {
        return err
    }
    return postgres.Exec(ctx, r.DB, InsertPaymentQuery, orgID, name, string(raw), quote.Total, quote.Currency, orderID)
}

// FulfillPaymentRepository returns ErrNotFound if the order was already paid
// (or does not exist).
func (r *App) FulfillPaymentRepository(ctx context.Context, orderID, paymentID, creditID string) (string, error) {
    var id string
    err := r.DB.QueryRow(ctx, FulfillPaymentQuery, orderID, paymentID, creditID, generic.FeatureKeyDuration).Scan(&id)
    return id, postgres.MapPgError(err)
}

func (r *App) GetPaymentCreditRepository(ctx context.Context, orderID, orgID string) (string, error) {
    var id string
    err := r.DB.QueryRow(ctx, GetPaymentCreditQuery, orderID, orgID).Scan(&id)
    return id, postgres.MapPgError(err)
}
