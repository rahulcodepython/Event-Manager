# Identity Card

Identity card generator + attendance tracker for organizations running
events (established or flash) with optional sub-events.

## Layout

- `apps/web` — Next.js app (App Router, shadcn/ui, react-hook-form + zod).
  Owns auth entirely, via [better-auth](https://better-auth.com).
- `apps/server` — Go/Fiber API (Postgres via sqlc + pgx). Verifies
  bearer JWTs against `apps/web`'s JWKS endpoint; issues none itself.
- `infra` — local dev infrastructure (Postgres, Redis via Docker Compose).

See `apps/web/README.md` and `apps/server/README.md` for per-app setup.

## Local development

```bash
cd infra && docker compose up -d      # postgres, migrate, redis
cd apps/server && make dev            # migrates on boot
cd apps/web && bun install && bun dev
```

## Architecture & Billing Documentation

For a detailed explanation of the credit-based event permission model, payment flows, subscription lifecycle, and event creation authorization, see [BILLING_SYSTEM.md](BILLING_SYSTEM.md).

