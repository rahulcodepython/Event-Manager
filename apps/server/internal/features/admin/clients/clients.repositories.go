package clients

import (
    "context"
    "encoding/json"

    "identitycard-server/internal/features/pricing"
    "identitycard-server/internal/generic"
    "identitycard-server/internal/pkg/postgres"
)

func (r *App) ListRepository(ctx context.Context, search, status string, page, limit int) (*ClientList, error) {
    return postgres.QueryJSON[ClientList](ctx, r.DB, ListClientsQuery, search, status, limit, (page-1)*limit)
}

func (r *App) GetRepository(ctx context.Context, orgID string) (*ClientDetail, error) {
    return postgres.QueryJSON[ClientDetail](ctx, r.DB, GetClientQuery, orgID)
}

func (r *App) ExistsRepository(ctx context.Context, orgID string) (bool, error) {
    var ok bool
    err := r.DB.QueryRow(ctx, ClientExistsQuery, orgID).Scan(&ok)
    return ok, postgres.MapPgError(err)
}

func (r *App) SetSuspendedRepository(ctx context.Context, orgID string, suspended bool) (string, error) {
    var ownerID string
    err := r.DB.QueryRow(ctx, SetSuspendedQuery, orgID, suspended).Scan(&ownerID)
    return ownerID, postgres.MapPgError(err)
}

func (r *App) ResetTrialRepository(ctx context.Context, orgID string) error {
    return postgres.Exec(ctx, r.DB, ResetTrialQuery, orgID)
}

func (r *App) GrantCreditRepository(ctx context.Context, orgID, name string, quote *pricing.Quote) (string, error) {
    raw, err := json.Marshal(quote)
    if err != nil {
        return "", err
    }
    var id string
    err = r.DB.QueryRow(ctx, GrantCreditQuery, orgID, name, string(raw), generic.FeatureKeyDuration).Scan(&id)
    return id, postgres.MapPgError(err)
}

// RefundPaymentRepository returns the payment's organization id, or
// ErrNotFound if the payment is not in the paid state.
func (r *App) RefundPaymentRepository(ctx context.Context, paymentID, note string) (string, error) {
    var orgID string
    err := r.DB.QueryRow(ctx, RefundPaymentQuery, paymentID, note).Scan(&orgID)
    return orgID, postgres.MapPgError(err)
}

func (r *App) PaymentStatusRepository(ctx context.Context, paymentID string) (string, error) {
    var status string
    err := r.DB.QueryRow(ctx, PaymentStatusQuery, paymentID).Scan(&status)
    return status, postgres.MapPgError(err)
}
