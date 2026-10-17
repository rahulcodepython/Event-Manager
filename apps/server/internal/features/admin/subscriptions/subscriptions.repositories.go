package subscriptions

import (
    "context"

    "identitycard-server/internal/pkg/postgres"
)

func (r *App) ListRepository(ctx context.Context) ([]Subscription, error) {
    return postgres.QueryJSONSlice[Subscription](ctx, r.DB, ListSubscriptionsQuery)
}

func (r *App) GetRepository(ctx context.Context, id string) (*Subscription, error) {
    return postgres.QueryJSON[Subscription](ctx, r.DB, GetSubscriptionQuery, id)
}

func (r *App) CreateRepository(ctx context.Context, req SubscriptionRequest) (string, error) {
    var id string
    err := r.DB.QueryRow(ctx, CreateSubscriptionQuery,
        req.Name, req.Vendor, req.Amount, req.IntervalMonths, req.NextDueOn, req.CategoryID, req.IsActive, req.Notes).Scan(&id)
    return id, postgres.MapPgError(err)
}

func (r *App) UpdateRepository(ctx context.Context, id string, req SubscriptionRequest) error {
    var out string
    err := r.DB.QueryRow(ctx, UpdateSubscriptionQuery,
        id, req.Name, req.Vendor, req.Amount, req.IntervalMonths, req.NextDueOn, req.CategoryID, req.IsActive, req.Notes).Scan(&out)
    return postgres.MapPgError(err)
}

func (r *App) DeleteRepository(ctx context.Context, id string) (bool, error) {
    tag, err := r.DB.Exec(ctx, DeleteSubscriptionQuery, id)
    return tag.RowsAffected() > 0, postgres.MapPgError(err)
}

// RenewRepository returns ErrNotFound if the subscription is missing or inactive.
func (r *App) RenewRepository(ctx context.Context, id string, amount *int64, paidOn string) error {
    var out string
    err := r.DB.QueryRow(ctx, RenewSubscriptionQuery, id, amount, paidOn).Scan(&out)
    return postgres.MapPgError(err)
}

func (r *App) GetCategoryKindRepository(ctx context.Context, id string) (string, error) {
    var kind string
    err := r.DB.QueryRow(ctx, GetCategoryKindQuery, id).Scan(&kind)
    return kind, postgres.MapPgError(err)
}
