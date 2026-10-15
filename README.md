# Identity Card

Event registration, QR identity and attendance platform. Organizers create an
event, publish a registration form, collect applicants, and scan their QR codes
at the door with paired scanner devices.

## Layout

- `apps/web` — client dashboard, public registration form and scanner UI
  (Next.js App Router, shadcn/ui, TanStack Query, react-hook-form + zod).
- `apps/server` — Go/Fiber API. Two binaries share one codebase:
  `cmd/server` (client API, port 8000) and `cmd/admin` (platform admin API,
  port 8001).
- `infra` — local Postgres, migrations and Redis via Docker Compose.

The roadmap lives in [PLAN.md](PLAN.md); project history and coding rules in
[PROJECT_MEMORY.md](PROJECT_MEMORY.md).

## Local development

```bash
cd infra && docker compose up -d          # postgres, migrate (runs once), redis
cd apps/server && cp .env.example .env
make dev                                  # client API on :8000
make dev-admin                            # admin API on :8001
cd apps/web && cp .env.example .env.local && bun install && bun dev   # :3000
```
