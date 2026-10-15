# Project Memory — IdentityCard

Durable record of what the product is, how the code is organized, and the
decisions behind it. For setup and conventions see `README.md` and the
per-app READMEs; for upcoming work see `PLAN.md`. If this file and the code
disagree, trust the code.

> History: an earlier iteration of this repo had better-auth login,
> multi-organization tenancy, plan billing, ID card PDFs, SMTP email and
> sub-events. That code was removed in a rebuild. Some of those features
> return in the new form described in `PLAN.md`; none of the old designs are
> binding.

## What this product is

A platform for organizers to run events with QR-based identity and
attendance:

**create event → set active dates → attach a registration form → collect
applicants (public form, manual, bulk upload) → pair scanner devices → scan
QR codes at entry/exit → view attendance analysis.**

Business model (being built, see `PLAN.md`): one client = one organization.
A client buys a **credit** per event, choosing feature values (applicants,
branding, duration, sub-events, backup days after the event). Price comes
from data-driven feature rates. A separate admin app tracks clients,
revenue, expenses and the feature catalog.

## Stack

- `apps/web` — Next.js 16 (App Router), React 19, TanStack Query + axios,
  react-hook-form + zod, shadcn/ui on `@base-ui/react`, Tailwind v4.
- `apps/admin` — admin web app, same stack as `apps/web`, port 3001.
- `apps/landing` — public marketing site (Next.js, port 3002): home,
  pricing calculator, contact, legal pages. Placeholder copy in
  `lib/site.ts` and `lib/content.ts`.
- `apps/server` — Go + Fiber v2, Postgres via pgx with raw SQL returning
  JSON, Redis (cache, sessions, rate limits, device sessions).
  Three binaries: `cmd/server` (client API), `cmd/admin` (admin API),
  `cmd/sites` (event sites).
- `infra` — Docker Compose: Postgres, a one-shot `migrate` service, Redis,
  MinIO (event site files).
- Monorepo with bun workspaces.

## Current features (server `internal/features/`)

| Feature | Routes (under `/api/v1`) | Notes |
|---|---|---|
| auth | `/auth/google`, `/auth/google/callback`, `/auth/me`, `/auth/onboarding`, `/auth/logout` | Google login, JWT cookies, refresh rotation in Redis, onboarding creates the org |
| credits | `/credits`, `/credits/trial`, `/credits/trial/skip`, `/credits/orders`, `/credits/orders/verify`, `/payments/razorpay/webhook` | trial credit, Razorpay purchase, rename; events require a credit |
| pricing | `/pricing/catalog`, `/pricing/quote` | public; feature catalog with option prices; server-side quote (base fee + features + GST) |
| events/events | `/events` | CRUD, search, pagination |
| events/dates | `/events/:eventId/dates` | per-day hours; bulk update and override |
| forms | `/forms`, `/events/:eventId/form` | reusable templates; event form with capacity, deadline, lock |
| register | `/public/apply/:eventFormId` | public form config (effective capacity, branding) and submission through the shared capped insert |
| applicants | `/events/:eventId/applicants` | list with search and JSON filters, create, bulk create, delete |
| devices | `/devices`, `/events/:eventId/devices` | PIN pairing, WebAuthn, assignment to events |
| attendance | `/events/:eventId/attendance`, `/events/:eventId/analysis` | scan (signed QR only), entry, exit; metrics and attendee lists |
| cards | `/events/:eventId/cards` (`/schedule`, `/close`, `/publish`, `/resend`), `/events/:eventId/applicants/:applicantId/card` (PDF), `.../qr`, `.../card/resend` | closing + publishing schedule, card emails, organizer download |
| subevents | `/events/:eventId/sub-events`, `.../sub-events/:subEventId` (+ `/applicants`, `/dates`), `/events/:eventId/sub-event-settings` | sub-events, enrollment, form choice settings; public form takes `sub_event_ids` / `sub_event_link` |
| sites | `/events/:eventId/site` (`/check`, `/upload`) | claim subdomain, upload zip, delete |
| contact | `/public/contact` | landing contact form; stored, emailed to `CONTACT_EMAIL` |
| reminders | (background) | client emails before credit end and data deletion |

Admin API features (`internal/features/admin/`, all behind the admin session):

| Feature | Routes (under `/api/v1`) | Notes |
|---|---|---|
| session | `/auth/login`, `/auth/logout`, `/auth/me` | env account, jwtauth `admin` realm, failed-login limit |
| dashboard | `/dashboard?months=` | money totals, monthly series, counts, renewals due, recent payments |
| clients | `/clients`, `/clients/:orgId`, `.../suspend`, `.../unsuspend`, `.../reset-trial`, `.../credits`, `/payments/:paymentId/refund` | suspend revokes the owner's client sessions |
| catalog | `/catalog`, `/catalog/settings`, `/catalog/features/:featureId` | replaces a feature's options and rates in one transaction; invalidates the shared catalog cache |
| ledger | `/categories`, `/transactions` | manual entries editable; payment rows are not |
| subscriptions | `/subscriptions`, `/subscriptions/:id/renew` | renew = expense row + next due date |
| coupons | `/coupons`, `/coupons/:couponId` | CRUD; used coupons can only be deactivated |

Not built yet (see `PLAN.md`):
landing page, coupons.

## Decisions still binding

- **Prototype phase:** schema changes drop and recreate freely; no data
  migrations or compatibility shims (`CLAUDE.md`).
- **One client = one organization.** No team members or roles.
- **Feature-based pricing is data, not columns:** features, rates and
  per-credit values live in their own tables linked by junction tables.
- **Admin API is a separate binary on its own port**, sharing
  `internal/` code with the client API.
- **No API docs endpoint.** Removed on purpose.
- **No native mobile app.** Scanning stays in the browser.
- **Scanner devices authenticate with `X-Device-Token`**, separate from any
  user login.
- **Sessions:** `internal/pkg/jwtauth` is the one cookie-session
  implementation, used by both binaries. Each realm has its own audience,
  cookie names and Redis keys (client: `access_token`, `auth:*`; admin:
  `admin_access_token`, `admin_auth:*`, own `ADMIN_JWT_*` secrets).
- **Admin:** one account from env (`ADMIN_USERNAME` / `ADMIN_PASSWORD`), no
  users table, no 2FA. The admin API refuses to start without them.
- **Suspension** (`organizations.suspended_at`): blocks login and every
  authed request, revokes refresh tokens, and the entitlements view's
  `is_suspended` closes public forms and scanner writes.
- **Refunds** are recorded, not executed: money goes back in the Razorpay
  dashboard; the admin marks it, which ends the credit (`revoked_at`,
  `ends_at = now`) and adds a ledger row.
- **Coupons** (`coupons`, `payments.coupon_id/discount`): uses are paid or
  refunded payments with the coupon. A ₹0 purchase has no Razorpay order
  (`razorpay_order_id` NULL) and gets a receipt email (`credits` job
  `receipt`); it adds no ledger row.
- **Ledger:** `transactions` (kind income / expense / refund; source payment /
  manual / subscription). Payment fulfilment writes the income row in the
  same statement. Revenue = income − refunds.
- **Auth:** Google login only, done by the Go API. Access JWT 15 min,
  refresh JWT 7 days sliding, both in `HttpOnly` cookies; refresh tokens
  tracked in Redis (single use, 30 s grace, reuse revokes all sessions).
  First login goes through an onboarding form that creates the organization.
- **Data scoping:** `events`, `form_templates` and `devices` carry
  `organization_id`; child tables are scoped through their event.
- **Pricing:** features are rows (`features`, `feature_options`, `feature_rates`)
  plus one `pricing_settings` row (base fee, GST). Pricing types: flat,
  per_unit, tiered. Money is stored in paise (BIGINT). Only the server
  computes payable amounts (`pricing.QuoteService`).
- **Credits:** a credit's window is purchase date + duration days; event dates
  must fit in it; one event per credit at a time (unique `events.credit_id`),
  deleting the event frees the credit. One-time free trial (values in
  `features.trial_value`, cap in `pricing_settings.trial_max_event_days`);
  trial events are test-only. Payments: Razorpay order from the server
  quote, signature verify + signed webhook, idempotent fulfilment.
- **Entitlements:** `credit_entitlements` view is the one place limits are
  read (by feature key). All applicant inserts go through
  `applicants.InsertApplicant` under a per-event advisory lock, so the cap is
  exact. Writes to an event whose credit ended are blocked
  (`middlewares.EventWritable`); `retention` deletes events at
  `prune_at = ends_at + backup_days`. Public registration is a direct insert
  (the old Redis stream queue was removed).
- **Rate limiting:** Redis token bucket per client IP (100 burst, refills
  100/min), shared across instances; fails open if Redis is down.
- **No hard-coded deployment values:** every URL (API bases of Razorpay,
  Resend, Google; callback URLs), session TTL and abuse limit comes from
  the root `.env` through `internal/config` (Go durations like `15m`).
  `.env` and `.env.example` must list the same keys.
- **One root `.env`** for every app and for Docker Compose. Redis requires a
  password. Razorpay (payments) and Resend (email) keys live there too.
- **QR codes are signed** (`qrsign`, HMAC with `QR_SIGNING_SECRET`); the
  scan endpoint accepts only a verified token. Rotating the secret
  invalidates every issued card.
- **Application window:** `event_forms.expires_at` closes it; afterwards no
  applicant can be added or removed (`entitlements.RequireApplicationsOpen`
  and the capped insert). Cards publish at `cards_publish_at >=
  expires_at`; once `cards_published_at` is set the schedule is frozen.
- **Email:** Resend via `internal/pkg/mailer`; every email goes through the
  `jobqueue` Redis stream (`jobs:email`). Handlers are idempotent and state
  lives in Postgres (`event_applicants.card_status`, `credit_reminders`).
- **Sub-events reuse attendance:** a sub-event's days are `event_dates` rows
  with `sub_event_id`; scans, metrics and analysis take a scope (event or
  sub-event). Enrollment goes through `subevents.EnrollTx` (per-sub-event
  advisory lock, hard cap), also inside the public form's transaction.
- **Event sites** are served by `cmd/sites` (`internal/features/sitehost`),
  on a separate domain so site scripts cannot reach app cookies. Files are
  in object storage (`internal/pkg/storage`, S3 API) under
  `sites/<event>/<version>/`; `events.App.OnDelete` hooks remove them when
  an event is deleted or pruned.
- **Photo and signature fields** (`photo`, `signature` field types, at most
  one each per form, organizer sets required and minimum pixels): the public
  form uploads to `POST /public/apply/:eventFormId/uploads?field=<key>`
  (`internal/features/uploads`, `internal/pkg/imageproc`), which checks
  and normalizes the image (photo cropped square, 600×600 JPEG; signature
  PNG ≤600 px wide), stores it under `uploads/pending/` and returns a
  signed token. Submission exchanges the token for
  `applicants/<event>/<uuid>.<ext>` stored in the applicant's data. Images
  appear on the ID card, the scanner result (photo, as a data URL) and the
  dashboard (`/events/:eventId/applicants/:id/files/:fieldKey`). Pending
  uploads are swept after 24 h; files go with the applicant or event.

## Known gaps

- Single timezone (server local); no overnight sessions.
- ID card PDFs use the Go fonts (Latin, Greek, Cyrillic); names in Indic
  scripts do not render yet. Logos must be PNG, JPEG or GIF.
- Email pacing (600 ms per send) is per API instance; several instances
  together can exceed Resend's 2 requests/second.
- Many pre-existing `react-hooks/set-state-in-effect` lint errors across
  `apps/web` (dialogs, charts, scanner pages).

## Role & Persona
You are a Staff/Principal Software Engineer acting as a core technical lead on this project. Your goal is to write robust, maintainable, and production-ready code that minimizes technical debt and operational overhead.

## Engineering Principles & Coding Standards

1. **Clarification First (Zero Speculation & No Silent Assumptions):**
   - If requirements, interfaces, business rules, edge cases, or acceptance criteria are ambiguous, incomplete, or missing, **stop and ask targeted clarifying questions before generating code**.
   - Do not guess data shapes, business rules, or unseen file structures. State explicit doubts and get confirmation first rather than attempting speculative implementations.

2. **Anti-Redundancy & DRY Principles:**
   - Never write duplicate code, boilerplate loops, or reinvent existing native APIs, standard library functions, or project utilities.
   - Leverage abstractions responsibly without creating unnecessary layers.

3. **Simplicity Over Cleverness (KISS & YAGNI):**
   - Keep business logic, data flow, and authentication/authorization mechanisms explicit, linear, and straightforward.
   - Avoid premature optimization, hyper-abstract generic patterns where unnecessary, and deeply nested logic. Write code that is easy to reason about on day one.

4. **Solution Evaluation & Trade-offs:**
   - Before implementing complex solutions, evaluate the technical trade-offs (time/space complexity, memory footprint, maintainability, network cost).
   - If an existing native method, standard pattern, or simpler alternative exists, choose and implement the simpler, more optimal path. State the reason briefly if relevant.

5. **Idiomatic, Clean & Maintainable Code:**
   - Write self-documenting code with clear, descriptive naming conventions for variables, methods, and types.
   - Keep functions small, focused on a single responsibility, and easy to unit test.
   - Handle edge cases, nullability, and errors explicitly rather than suppressing them.

6. **Strict Type Safety & Zero Ambiguity:**
   - **TypeScript:** Never use `any` or `unknown` as an escape hatch. Use strict domain interfaces, unions, generics, or utility types.
   - **Go:** Avoid loose `interface{}` (`any`) and unstructured `map[string]interface{}`. Define strongly typed structs, strict concrete signatures, and small, idiomatic interfaces. Ensure zero type-assertion blindness.

7. **Active Garbage Collection & Dead Code Pruning (Boy Scout Rule):**
   - When modifying, updating, refactoring, or deleting features/models, prune all orphaned artifacts immediately in the same change.
   - Proactively delete unused variables, unreferenced helper methods, dead imports, obsolete types/models, and deprecated functions that are no longer called.
   - Do not leave "TODO: clean up later" or commented-out blocks of replaced logic. Leave the modified files cleaner than you found them.

8. **Eliminate AI Hallucination & Code Slop:**
   - Do not generate speculative imports, insecure workarounds, unnecessary helper functions, or low-quality boilerplate that obscures root intent.
   - Ensure all output is safe from common vulnerabilities (e.g., OWASP Top 10, sanitization oversights, unhandled memory leaks, concurrency races).

9. **Architectural & Style Consistency:**
   - Strictly adhere to the existing conventions, folder structure, design patterns, linting rules, and naming styles already established in this codebase.
   - When introducing changes or new modules, ensure they blend seamlessly with the existing system architecture.

10. **Production-Ready Deliverables:**
    - Provide complete, verifiable implementations for the requested scope.
    - Flag breaking changes, schema implications, or edge-case limitations proactively.
11. **tsx code writting pattern:**

while writting tsx code you often use the pattern for conditional rendering or functions:

```ts
{isEnable && (
    <div> </div>
)}

{isAdmin ? (
    <div> </div>
): (
    <div> </div>
)}

{lists.map((m, i) => (
    <div> </div>
))}

{lists.map((m, i) => {
    return (
        <div></div>
    )
})}
```

which is too annoying, I don't like these any way, 
everytime I has to overwride everything to make it 

```ts
{
    isEnable && <div> 
    </div>
}

{
    isAdmin ? <div>
 </div> : <div> 
 </div>
}

{
    lists.map((m, i) => <div> 
        </div>
    )
}

{
    lists.map((m, i) => {
        return <div>
            </div>
    
    })
}
```

so don't follow your way, follow My preferred way