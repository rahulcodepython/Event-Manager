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

func (r *App) GetSessionOrgRepository(ctx context.Context, userID string) (sessionOrg, error) {
    var org sessionOrg
    err := r.DB.QueryRow(ctx, GetSessionOrgQuery, userID).Scan(&org.ID, &org.Suspended)
    return org, postgres.MapPgError(err)
}

func (r *App) IsSuspendedRepository(ctx context.Context, orgID string) (bool, error) {
    var suspended bool
    err := r.DB.QueryRow(ctx, IsSuspendedQuery, orgID).Scan(&suspended)
    return suspended, postgres.MapPgError(err)
}

func (r *App) GetMeRepository(ctx context.Context, userID string) (*MeResponse, error) {
    return postgres.QueryJSON[MeResponse](ctx, r.DB, GetMeQuery, userID)
}

func (r *App) CreateOrganizationRepository(ctx context.Context, userID, name, phone string) (*Organization, error) {
    return postgres.QueryJSON[Organization](ctx, r.DB, CreateOrganizationQuery, userID, name, phone)
}
