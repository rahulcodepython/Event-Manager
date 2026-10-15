# apps/server

Go + Fiber API over Postgres (pgx) and Redis. One codebase, two binaries:

| Binary | Entry | Router | Port env | Purpose |
|---|---|---|---|---|
| client API | `cmd/server/main.go` | `internal/router/app.router.go` | `API_PORT` (8000) | dashboard, public registration, scanner |
| admin API | `cmd/admin/main.go` | `internal/router/admin.router.go` | `ADMIN_API_PORT` (8001) | platform admin |
| sites | `cmd/sites/main.go` | `internal/router/sites.router.go` | `SITES_PORT` (8002) | uploaded event sites at `<slug>.<SITES_DOMAIN>` |

`internal/router/shared.go` holds what both binaries share: Fiber defaults
(`NewFiberApp`), the middleware stack and `/health`, and graceful shutdown
(`Listen`).

## Setup

Config comes from the repo-root `.env` (see `/.env.example`).

```bash
bun run docker:up   # from the repo root; runs migrations once via the migrate service
cd apps/server
make dev            # client API
make dev-admin      # admin API
make dev-sites      # event sites
make seed           # optional demo data (cmd/seed: -action=seed|flush|regenerate)
```

## Auth and routing tiers

`internal/features/auth` handles Google login (OAuth code flow with state +
PKCE) and issues two HS256 JWTs as `HttpOnly`, `SameSite=Lax` cookies:

- `access_token`: 15 minutes, carries user id and organization id.
- `refresh_token`: 7 days, sliding. Its id is stored in Redis, so each one
  can be used once (30 s grace for parallel requests). Reusing an old one
  revokes all of that user's sessions. Logout revokes it.

`auth.RequireAuth` accepts a valid access token. If it is expired (or
missing) it rotates the refresh token and continues; anything invalid
clears both cookies and returns 401.

Sessions live in `internal/pkg/jwtauth` (issue, rotate, revoke, cookies,
`Authenticate`), shared by both binaries. `jwtauth.ClientConfig` and
`jwtauth.AdminConfig` give each realm its own audience, secrets, cookie names
and Redis keys, so a client token never works on the admin API.

The admin API (`internal/features/admin/session`) checks
`ADMIN_USERNAME` / `ADMIN_PASSWORD` from the environment (5 failed attempts
per IP per 15 min) and guards every other admin route with
`session.RequireAdmin`. `cmd/admin` refuses to start without the four
`ADMIN_*` settings.

`app.router.go` mounts routes in three tiers:

1. **Public:** Google login, public registration form, scanner devices
   (authenticated by `X-Device-Token`, not a user session).
2. **Logged in:** `/auth/me`, `/auth/onboarding`.
3. **Logged in with an organization:** everything else. `middlewares.OwnedBy`
   404s any `/events/:eventId`, `/forms/:formId` or `/devices/:deviceId` path
   whose row belongs to another organization. List and create queries take
   the organization id from `middlewares.OrgID(c)`.

Feature routes follow this split: `RegisterPublicRoutes` for tier 1 and
`RegisterRoutes` for tier 3.

## Feature layout

Each feature lives in `internal/features/<name>/` (nested for sub-areas, e.g.
`events/dates`) and is split by file suffix:

| File | Role |
|---|---|
| `<name>.app.go` | `App` struct holding dependencies (`DB`, `Cache`, ...) and `NewApp` |
| `<name>.routes.go` | `RegisterRoutes(r fiber.Router)` |
| `<name>.handlers.go` | parse request, call service, map errors to responses |
| `<name>.services.go` | business rules and validation, cache invalidation |
| `<name>.repositories.go` | thin calls into `internal/pkg/postgres` |
| `<name>.queries.go` | raw SQL constants |
| `<name>.entities.go` | request/response structs |
| `<name>.helper.go` | feature-local helpers (optional) |

A feature registers itself in `app.router.go` (client) or `admin.router.go`
(admin). Admin features live under `internal/features/admin/`.

## Conventions

- **SQL:** queries return JSON built in Postgres (`jsonb_build_object`) and are
  decoded with `postgres.QueryJSON[T]` / `QueryJSONSlice[T]`; writes use
  `postgres.Exec`. Multi-statement writes use `postgres.WithTx`. Postgres errors
  map to `postgres.ErrNotFound` / `ErrConflict` via `MapPgError`.
- **Responses:** always through `internal/utils` (`OK`, `Created`, `ErrBadRequest`,
  `ErrConflict`, `ErrInternal`, ...), giving `{success, message, data | error}`.
- **Cache:** `internal/pkg/cache` over Redis; reads use `RememberWithJitter`,
  services delete key patterns after writes. Key formats live in
  `internal/generic/constants.go`.
- **Money** is an integer in the smallest currency unit (paise), never a float.
- **Rate limiting:** `middlewares.RateLimiterMiddleware` is a Redis token
  bucket (Lua script, atomic) per client IP: 100-request burst refilling at
  100/min, `X-RateLimit-*` and `Retry-After` headers. If Redis fails the
  request is allowed.
- **Applicant limits:** every applicant insert (dashboard, bulk, public form)
  goes through `applicants.InsertApplicant`, which checks the event's credit
  (`credit_entitlements` view) under a per-event advisory lock.
- **Background jobs** (inside the client API, each guarded by a Redis lock):
  `retention` (hourly) deletes events past their credit's backup period;
  `cards` (every minute) publishes due cards and re-queues stuck ones;
  `reminders` (every 10 min) queues client reminder emails.
- **Email queue:** `internal/pkg/jobqueue` on the Redis stream `jobs:email`
  (consumer group, retry sorted set, 5 attempts, reclaim after 5 min idle),
  sending one email per 600 ms. Handlers must be idempotent.
- **ID cards:** `internal/pkg/idcard` renders the PDF; `internal/pkg/qrsign`
  signs and verifies QR payloads.
- **Scanner devices** authenticate with the `X-Device-Token` header (paired by
  PIN, optional WebAuthn), not a user session.
- **Migrations:** plain numbered SQL in `internal/migrations`. During the
  prototype phase, change schemas freely; no data-preserving migrations are
  needed (see `CLAUDE.md`).
- **Formatting:** 4-space indentation in all files (`AGENTS.md`).

## Commands

| Command | What it does |
|---|---|
| `make dev` / `make dev-admin` | run the client / admin API |
| `make build` / `make build-admin` | build `bin/server` / `bin/admin` |
| `make seed`, `make flush` | seed or wipe demo data (`SEED_CLIENT_EMAIL` owns it) |
| `make migrate-up` / `migrate-down` | apply / roll back one migration |
| `make migrate-new name=<desc>` | scaffold a migration pair |
| `make lint` | `go vet` + `gofmt -l` |
