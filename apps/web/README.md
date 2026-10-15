# apps/web

Client-facing Next.js app (App Router): organizer dashboard, the public
registration form (`/apply/[eventFormId]`) and the scanner device screens
(`/devices/pair`, `/devices/scan`). All data comes from `apps/server` through
the browser.

## Setup

Env comes from the repo-root `.env`, loaded in `next.config.ts`.

```bash
bun install
bun dev                       # http://localhost:3000
```

## Auth

- `/login` sends the browser to the API's Google login. The API sets
  `HttpOnly` cookies and redirects back to `/dashboard`, or `/onboarding` on
  first login.
- `useMeQuery` (`query-hooks/auth.api.ts`) is the session. The dashboard
  layout waits for it and sends users without an organization to onboarding.
- Any 401 on `/dashboard` or `/onboarding` pages makes the axios client
  reload on `/login`, which logs out and drops all cached data.
- Requests carry cookies (`withCredentials`); the token refresh happens on the
  API side, so the client never handles tokens.

## Structure

| Path | What lives there |
|---|---|
| `app/` | routes; `login`, `onboarding`, `dashboard/` (guarded), `apply/` and `devices/` (public) |
| `components/<domain>/` | feature components (`applicants`, `events`, `forms`, `devices`, `analysis`, ...) |
| `components/generic/` | shared building blocks: `PageHeader`, `InfiniteDataTable`, `DebouncedInput` |
| `components/ui/` | shadcn/ui primitives (`@base-ui/react`, use `render={...}`, not `asChild`) |
| `query-hooks/<module>.api.ts` | TanStack Query hooks per backend feature; mutations toast their own result |
| `react-query/` | axios client (`apiRequest` validates every response with zod) and query keys |
| `schema/<module>.types.ts` | zod schemas mirroring the Go entities, kept in sync by hand |
| `lib/` | `nav.ts` (sidebar + event sections), `csv.ts`, date and misc utils |

## Conventions

- **Event pages** call `useEventPage("Title")` (from `components/events/event-context.tsx`)
  to get the event and set breadcrumbs, and render a `PageHeader` first. The
  layout already wraps them in the `container` utility.
- **Forms:** react-hook-form + zod resolver.
- **JSX conditionals and lists:** braces on their own lines, no wrapping parens
  (see "tsx code writting pattern" in `PROJECT_MEMORY.md`). Prettier rewrites
  this style, so don't run it over hand-written JSX.
- **Formatting:** 4-space indentation (`AGENTS.md`).
