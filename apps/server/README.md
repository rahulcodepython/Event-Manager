# apps/server

Go + Fiber API over Postgres (pgx) and Redis. One codebase, two binaries:

| Binary | Entry | Router | Port env | Purpose |
|---|---|---|---|---|
| client API | `cmd/server/main.go` | `internal/router/app.router.go` | `PORT` (8000) | dashboard, public registration, scanner |
| admin API | `cmd/admin/main.go` | `internal/router/admin.router.go` | `ADMIN_PORT` (8001) | platform admin |

`internal/router/shared.go` holds what both binaries share: Fiber defaults
(`NewFiberApp`), the middleware stack and `/health`, and graceful shutdown
(`Listen`).

## Setup

```bash
cp .env.example .env
cd ../../infra && docker compose up -d   # runs migrations once via the migrate service
cd ../apps/server
make dev            # client API
make dev-admin      # admin API
make seed           # optional demo data (cmd/seed: -action=seed|flush|regenerate)
```

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
(admin).

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
- **Public registration** is queued in Redis and written by a worker started
  from `app.router.go` (`register.StartWorker`).
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
| `make seed`, `make flush` | seed or wipe demo data |
| `make migrate-up` / `migrate-down` | apply / roll back one migration |
| `make migrate-new name=<desc>` | scaffold a migration pair |
| `make lint` | `go vet` + `gofmt -l` |
