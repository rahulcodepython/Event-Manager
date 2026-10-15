package sites

import (
    "bytes"
    "context"
    "errors"
    "fmt"
    "log/slog"
    "strings"
    "time"

    "identitycard-server/internal/pkg/postgres"
)

var (
    ErrNotEntitled = errors.New("this event's credit does not include an event website")
    ErrSlugInvalid = errors.New("invalid subdomain")
    ErrSlugTaken   = errors.New("this subdomain is already taken")
    ErrNoSlug      = errors.New("choose a subdomain first")
    ErrNoSite      = errors.New("this event has no site")
)

// SiteKeyCache is the cache key cmd/sites uses for a slug's site.
func SiteKeyCache(slug string) string {
    return "cache:sites:host:" + slug
}

func (s *App) url(slug string) string {
    return strings.ReplaceAll(s.Cfg.SitesURLTemplate, "{slug}", slug)
}

func (s *App) GetService(ctx context.Context, eventID string) (*Site, error) {
    row, err := s.GetSiteRepository(ctx, eventID)
    if err != nil {
        return nil, err
    }
    site := &Site{
        Entitled:   row.Entitled,
        Slug:       row.Slug,
        HasFiles:   row.Version != nil,
        FileCount:  row.FileCount,
        TotalBytes: row.TotalBytes,
        UploadedAt: row.UploadedAt,
        Live:       row.Active && row.Version != nil,
    }
    if row.Slug != nil {
        u := s.url(*row.Slug)
        site.URL = &u
    }
    return site, nil
}

// CheckService reports whether a slug can be claimed by this event.
func (s *App) CheckService(ctx context.Context, eventID, slug string) (*CheckResponse, error) {
    slug, reason := ValidateSlug(slug)
    if reason != "" {
        return &CheckResponse{Slug: slug, Reason: reason}, nil
    }
    taken, err := s.SlugTakenRepository(ctx, slug, eventID)
    if err != nil {
        return nil, err
    }
    if taken {
        return &CheckResponse{Slug: slug, Reason: ErrSlugTaken.Error()}, nil
    }
    return &CheckResponse{Slug: slug, Available: true}, nil
}

// ClaimService sets or changes the event's subdomain; the old one is freed.
func (s *App) ClaimService(ctx context.Context, eventID string, req ClaimRequest) (*Site, error) {
    if err := s.requireEntitled(ctx, eventID); err != nil {
        return nil, err
    }
    slug, reason := ValidateSlug(req.Slug)
    if reason != "" {
        return nil, fmt.Errorf("%w: %s", ErrSlugInvalid, reason)
    }
    before, err := s.GetSiteRepository(ctx, eventID)
    if err != nil {
        return nil, err
    }
    if err := s.ClaimRepository(ctx, eventID, slug); err != nil {
        if errors.Is(err, postgres.ErrConflict) {
            return nil, ErrSlugTaken
        }
        return nil, err
    }
    if before.Slug != nil {
        s.invalidateSlug(ctx, *before.Slug)
    }
    s.invalidateSlug(ctx, slug)
    return s.GetService(ctx, eventID)
}

// UploadService replaces the site with a new zip. The new files are stored
// under a fresh version folder, the site switches to it in one update, and
// the old folder is deleted.
func (s *App) UploadService(ctx context.Context, eventID string, zipData []byte) (*Site, error) {
    if err := s.requireEntitled(ctx, eventID); err != nil {
        return nil, err
    }
    if len(zipData) > maxZipBytes {
        return nil, invalidSite("the zip is larger than %d MB", maxZipBytes>>20)
    }
    row, err := s.GetSiteRepository(ctx, eventID)
    if err != nil {
        return nil, err
    }
    if row.Slug == nil {
        return nil, ErrNoSlug
    }

    files, err := readZip(zipData)
    if err != nil {
        return nil, err
    }

    version := time.Now().UTC().Format("20060102T150405.000000000")
    var total int64
    for _, f := range files {
        if err := s.Store.Put(ctx, ObjectKey(eventID, version, f.Path), bytes.NewReader(f.Data), int64(len(f.Data)), f.ContentType); err != nil {
            s.deleteVersion(ctx, eventID, version)
            return nil, err
        }
        total += int64(len(f.Data))
    }

    old, err := s.SetVersionRepository(ctx, eventID, version, len(files), total)
    if err != nil {
        s.deleteVersion(ctx, eventID, version)
        return nil, err
    }
    if old != "" {
        s.deleteVersion(ctx, eventID, old)
    }
    s.invalidateSlug(ctx, *row.Slug)
    return s.GetService(ctx, eventID)
}

// DeleteService removes the site and its files and frees the subdomain.
func (s *App) DeleteService(ctx context.Context, eventID string) error {
    slug, err := s.DeleteSiteRepository(ctx, eventID)
    if errors.Is(err, postgres.ErrNotFound) {
        return ErrNoSite
    }
    if err != nil {
        return err
    }
    if err := s.Store.DeletePrefix(ctx, eventPrefix(eventID)); err != nil {
        slog.Warn("sites: delete files", "event", eventID, "error", err)
    }
    s.invalidateSlug(ctx, slug)
    return nil
}

func (s *App) requireEntitled(ctx context.Context, eventID string) error {
    row, err := s.GetSiteRepository(ctx, eventID)
    if err != nil {
        return err
    }
    if !row.Entitled {
        return ErrNotEntitled
    }
    return nil
}

func (s *App) deleteVersion(ctx context.Context, eventID, version string) {
    if err := s.Store.DeletePrefix(context.WithoutCancel(ctx), eventPrefix(eventID)+version+"/"); err != nil {
        slog.Warn("sites: delete version", "event", eventID, "version", version, "error", err)
    }
}

func (s *App) invalidateSlug(ctx context.Context, slug string) {
    if s.Cache != nil {
        _ = s.Cache.Delete(ctx, SiteKeyCache(slug))
    }
}

func (s *App) invalidateAll(ctx context.Context) {
    if s.Cache != nil {
        _ = s.Cache.DeletePattern(ctx, "cache:sites:host:*")
    }
}
