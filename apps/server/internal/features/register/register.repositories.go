package register

import (
    "context"

    "identitycard-server/internal/pkg/postgres"
)

func (r *App) GetPublicApplyConfigRepository(ctx context.Context, eventFormID string) (*PublicApplyConfigResponse, error) {
    return postgres.QueryJSON[PublicApplyConfigResponse](ctx, r.DB, GetPublicApplyQuery, eventFormID)
}
