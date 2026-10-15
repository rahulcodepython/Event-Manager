package sites

import (
    "context"

    "identitycard-server/internal/pkg/postgres"
)

func (r *App) GetSiteRepository(ctx context.Context, eventID string) (*siteRow, error) {
    return postgres.QueryJSON[siteRow](ctx, r.DB, GetSiteQuery, eventID)
}

func (r *App) SlugTakenRepository(ctx context.Context, slug, eventID string) (bool, error) {
    var taken bool
    err := r.DB.QueryRow(ctx, SlugTakenQuery, slug, eventID).Scan(&taken)
    return taken, postgres.MapPgError(err)
}

func (r *App) ClaimRepository(ctx context.Context, eventID, slug string) error {
    return postgres.Exec(ctx, r.DB, ClaimQuery, eventID, slug)
}

func (r *App) SetVersionRepository(ctx context.Context, eventID, version string, files int, bytes int64) (string, error) {
    var old string
    err := r.DB.QueryRow(ctx, SetVersionQuery, eventID, version, files, bytes).Scan(&old)
    return old, postgres.MapPgError(err)
}

func (r *App) DeleteSiteRepository(ctx context.Context, eventID string) (string, error) {
    var slug string
    err := r.DB.QueryRow(ctx, DeleteSiteQuery, eventID).Scan(&slug)
    return slug, postgres.MapPgError(err)
}
