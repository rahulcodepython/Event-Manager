# Identity Card

Event registration, QR identity and attendance platform. Organizers create an
event, publish a registration form, collect applicants, and scan their QR codes
at the door with paired scanner devices.

## Layout

- `apps/web` — client dashboard, public registration form and scanner UI
  (Next.js App Router, shadcn/ui, TanStack Query, react-hook-form + zod).
- `apps/admin` — platform admin web app (Next.js, same stack as `apps/web`):
  dashboard, clients, ledger, subscriptions, pricing catalog.
- `apps/server` — Go/Fiber API. Two binaries share one codebase:
  `cmd/server` (client API, port 8000), `cmd/admin` (platform admin API,
  port 8001) and `cmd/sites` (uploaded event sites, port 8002).
- `infra` — local Postgres, migrations, Redis and MinIO via Docker Compose.

The roadmap lives in [PLAN.md](PLAN.md); project history and coding rules in
[PROJECT_MEMORY.md](PROJECT_MEMORY.md).

## Environment

One `.env` at the repo root serves every app: copy `.env.example` to `.env`
and fill in the secrets. The Go binaries find it by walking up from their
working directory, `apps/web/next.config.ts` loads it with `@next/env`, and
Docker Compose reads it via `--env-file .env`. `${VAR}` references expand.

## Local development

```bash
cp .env.example .env                      # then fill JWT secrets, Google keys, passwords
bun run docker:up                         # postgres, migrate (runs once), redis
cd apps/server && make dev                # client API on :8000
cd apps/server && make dev-admin          # admin API on :8001
cd apps/server && make dev-sites          # event sites on :8002 (http://<slug>.sites.localhost:8002)
cd apps/web && bun install && bun dev     # :3000
cd apps/admin && bun dev                  # admin web on :3001
```

The admin logs in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`.

Google login needs the redirect URI `${API_URL}/api/v1/auth/google/callback`
registered on the Google OAuth client.
