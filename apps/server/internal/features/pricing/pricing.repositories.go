package pricing

import (
    "context"

    "identitycard-server/internal/pkg/postgres"
)

func (r *App) GetCatalogRepository(ctx context.Context) (*catalog, error) {
    return postgres.QueryJSON[catalog](ctx, r.DB, GetCatalogQuery)
}
