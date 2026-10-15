package dashboard

import (
    "context"

    "identitycard-server/internal/pkg/postgres"
)

func (r *App) GetRepository(ctx context.Context, months int) (*Dashboard, error) {
    return postgres.QueryJSON[Dashboard](ctx, r.DB, GetDashboardQuery, months)
}
