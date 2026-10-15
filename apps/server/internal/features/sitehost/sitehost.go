// Package sitehost serves uploaded event sites by Host header
// (<slug>.<SITES_DOMAIN>) for cmd/sites. Sites live on their own domain, so
// their scripts can never read the app's cookies.
package sitehost

import (
    "context"
    "errors"
    "fmt"
    "html/template"
    "io"
    "log/slog"
    "net/url"
    "path"
    "strings"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/jackc/pgx/v5/pgxpool"

    "identitycard-server/internal/config"
    "identitycard-server/internal/features/sites"
    "identitycard-server/internal/pkg/cache"
    "identitycard-server/internal/pkg/postgres"
    "identitycard-server/internal/pkg/storage"
)

const siteQuery = `
    SELECT jsonb_build_object(
        'event_id', es.event_id,
        'version', es.version,
        'active', ce.has_event_site AND NOT ce.is_expired AND NOT ce.is_suspended,
        'event_name', COALESCE(em.name, ''),
        'form_id', ef.id
    )
    FROM event_sites es
    JOIN events e ON e.id = es.event_id
    JOIN credit_entitlements ce ON ce.credit_id = e.credit_id
    LEFT JOIN event_metadata em ON em.id = e.id
    LEFT JOIN event_forms ef ON ef.event_id = e.id AND ef.is_locked
    WHERE es.slug = $1;
`

type site struct {
    EventID   string  `json:"event_id"`
    Version   *string `json:"version"`
    Active    bool    `json:"active"`
    EventName string  `json:"event_name"`
    FormID    *string `json:"form_id"`
}

type App struct {
    DB    *pgxpool.Pool
    Cache *cache.Cache
    Store *storage.Store
    Cfg   *config.Config
}

func NewApp(db *pgxpool.Pool, cch *cache.Cache, store *storage.Store, cfg *config.Config) *App {
    return &App{DB: db, Cache: cch, Store: store, Cfg: cfg}
}

func (h *App) lookup(ctx context.Context, slug string) (*site, error) {
    return cache.RememberWithJitter(ctx, h.Cache, sites.SiteKeyCache(slug), time.Minute, cache.DefaultJitterPercentage, func() (*site, error) {
        return postgres.QueryJSON[site](ctx, h.DB, siteQuery, slug)
    })
}

// slugFromHost returns the slug of "<slug>.<domain>[:port]", or "".
func (h *App) slugFromHost(host string) string {
    host = strings.ToLower(host)
    if i := strings.LastIndex(host, ":"); i >= 0 && !strings.Contains(host[i:], "]") {
        host = host[:i]
    }
    slug, ok := strings.CutSuffix(host, "."+strings.ToLower(h.Cfg.SitesDomain))
    if !ok || slug == "" || strings.Contains(slug, ".") {
        return ""
    }
    return slug
}

// Serve handles every request of the sites binary.
func (h *App) Serve(c *fiber.Ctx) error {
    if c.Method() != fiber.MethodGet && c.Method() != fiber.MethodHead {
        return c.SendStatus(fiber.StatusMethodNotAllowed)
    }
    c.Set("X-Content-Type-Options", "nosniff")
    c.Set("Referrer-Policy", "strict-origin-when-cross-origin")

    slug := h.slugFromHost(c.Hostname())
    if slug == "" {
        return page(c, fiber.StatusNotFound, "Site not found", "There is no event site at this address.")
    }
    s, err := h.lookup(c.UserContext(), slug)
    if errors.Is(err, postgres.ErrNotFound) {
        return page(c, fiber.StatusNotFound, "Site not found", "There is no event site at this address.")
    }
    if err != nil {
        slog.Error("sitehost: lookup", "slug", slug, "error", err)
        return page(c, fiber.StatusInternalServerError, "Something went wrong", "Please try again in a moment.")
    }
    if !s.Active {
        return page(c, fiber.StatusGone, s.EventName, "This event has ended. Its website is no longer available.")
    }

    // /register and /register/<sub-event id> go to the event's form.
    p := path.Clean("/" + c.Path())
    if p == "/register" || strings.HasPrefix(p, "/register/") {
        if s.FormID == nil {
            return page(c, fiber.StatusNotFound, s.EventName, "Registration is not open yet.")
        }
        target := strings.TrimRight(h.Cfg.WebURL, "/") + "/apply/" + *s.FormID
        if sub := strings.TrimPrefix(p, "/register/"); sub != p && sub != "" {
            target += "?sub=" + url.QueryEscape(sub)
        }
        return c.Redirect(target, fiber.StatusFound)
    }

    if s.Version == nil {
        return page(c, fiber.StatusNotFound, s.EventName, "This site is coming soon.")
    }
    return h.serveFile(c, s, p)
}

func (h *App) serveFile(c *fiber.Ctx, s *site, p string) error {
    ctx := c.UserContext()
    rel := strings.TrimPrefix(p, "/")

    candidates := []string{rel}
    switch {
    case rel == "" || strings.HasSuffix(c.Path(), "/"):
        candidates = []string{path.Join(rel, "index.html")}
    case path.Ext(rel) == "":
        candidates = []string{rel, rel + ".html", path.Join(rel, "index.html")}
    }

    for _, name := range candidates {
        obj, err := h.Store.Get(ctx, sites.ObjectKey(s.EventID, *s.Version, name))
        if errors.Is(err, storage.ErrNotFound) {
            continue
        }
        if err != nil {
            slog.Error("sitehost: get file", "event", s.EventID, "path", name, "error", err)
            return page(c, fiber.StatusBadGateway, s.EventName, "This site is temporarily unavailable.")
        }
        return send(c, fiber.StatusOK, name, obj)
    }

    // The site's own 404.html, else a plain page.
    if obj, err := h.Store.Get(ctx, sites.ObjectKey(s.EventID, *s.Version, "404.html")); err == nil {
        return send(c, fiber.StatusNotFound, "404.html", obj)
    }
    return page(c, fiber.StatusNotFound, s.EventName, "This page does not exist.")
}

func send(c *fiber.Ctx, status int, name string, obj *storage.Object) error {
    c.Status(status)
    c.Set(fiber.HeaderContentType, sites.ContentTypeFor(name))
    c.Set(fiber.HeaderCacheControl, "public, max-age=60")
    if obj.ETag != "" {
        c.Set(fiber.HeaderETag, `"`+obj.ETag+`"`)
        if c.Get(fiber.HeaderIfNoneMatch) == `"`+obj.ETag+`"` {
            obj.Body.Close()
            return c.SendStatus(fiber.StatusNotModified)
        }
    }
    defer obj.Body.Close()
    if c.Method() == fiber.MethodHead {
        c.Set(fiber.HeaderContentLength, fmt.Sprint(obj.Size))
        return nil
    }
    // Read it now: the request context (and with it the object stream) ends
    // when the handler returns, before a lazy stream would be sent. Site
    // files are at most 10 MB in total.
    body, err := io.ReadAll(obj.Body)
    if err != nil {
        return page(c, fiber.StatusBadGateway, "", "This site is temporarily unavailable.")
    }
    return c.Send(body)
}

var pageTemplate = template.Must(template.New("page").Parse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{.Title}}</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f4f5;font-family:system-ui,Arial,sans-serif;color:#18181b">
<div style="text-align:center;padding:24px;max-width:420px">
<h1 style="font-size:22px;margin:0 0 8px">{{.Title}}</h1>
<p style="margin:0;color:#52525b;font-size:15px;line-height:1.5">{{.Message}}</p>
</div></body></html>`))

func page(c *fiber.Ctx, status int, title, message string) error {
    if title == "" {
        title = "Event site"
    }
    c.Status(status)
    c.Set(fiber.HeaderContentType, fiber.MIMETextHTMLCharsetUTF8)
    c.Set(fiber.HeaderCacheControl, "no-store")
    return pageTemplate.Execute(c.Response().BodyWriter(), map[string]string{"Title": title, "Message": message})
}

// TLSCheck answers Caddy's on-demand TLS "ask": 200 only for hosts of an
// existing site, so certificates are never issued for random subdomains.
func (h *App) TLSCheck(c *fiber.Ctx) error {
    slug := h.slugFromHost(c.Query("domain"))
    if slug == "" {
        return c.SendStatus(fiber.StatusNotFound)
    }
    if _, err := h.lookup(c.UserContext(), slug); err != nil {
        return c.SendStatus(fiber.StatusNotFound)
    }
    return c.SendStatus(fiber.StatusOK)
}
