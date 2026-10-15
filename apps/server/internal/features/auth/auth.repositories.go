package auth

import (
    "context"

    "identitycard-server/internal/pkg/postgres"
)

func (r *App) UpsertGoogleUserRepository(ctx context.Context, info googleUserInfo) (string, error) {
    var id string
    err := r.DB.QueryRow(ctx, UpsertGoogleUserQuery, info.Sub, info.Email, info.Name, info.Picture).Scan(&id)
    return id, postgres.MapPgError(err)
}

func (r *App) GetOrganizationIDRepository(ctx context.Context, userID string) (string, error) {
    var id string
    err := r.DB.QueryRow(ctx, GetOrganizationIDQuery, userID).Scan(&id)
    return id, postgres.MapPgError(err)
}

func (r *App) GetMeRepository(ctx context.Context, userID string) (*MeResponse, error) {
    return postgres.QueryJSON[MeResponse](ctx, r.DB, GetMeQuery, userID)
}

func (r *App) CreateOrganizationRepository(ctx context.Context, userID, name, phone string) (*Organization, error) {
    return postgres.QueryJSON[Organization](ctx, r.DB, CreateOrganizationQuery, userID, name, phone)
}
