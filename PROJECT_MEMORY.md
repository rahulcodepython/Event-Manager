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
- `apps/server` — Go + Fiber v2, Postgres via pgx with raw SQL returning
  JSON, Redis (cache, registration queue, rate limits, device sessions).
  Two binaries: `cmd/server` (client API) and `cmd/admin` (admin API).
- `infra` — Docker Compose: Postgres, a one-shot `migrate` service, Redis.
- Monorepo with bun workspaces.

## Current features (server `internal/features/`)

| Feature | Routes (under `/api/v1`) | Notes |
|---|---|---|
| events/events | `/events` | CRUD, search, pagination |
| events/dates | `/events/:eventId/dates` | per-day hours; bulk update and override |
| forms | `/forms`, `/events/:eventId/form` | reusable templates; event form with capacity, deadline, lock |
| register | `/public/apply/:eventFormId` | public submission queued in Redis, written by a worker |
| applicants | `/events/:eventId/applicants` | list with search and JSON filters, create, bulk create, delete |
| devices | `/devices`, `/events/:eventId/devices` | PIN pairing, WebAuthn, assignment to events |
| attendance | `/events/:eventId/attendance`, `/events/:eventId/analysis` | scan, entry, exit, verify, offline sync; metrics and attendee lists |

Not built yet (see `PLAN.md`): client login and org scoping, credits and
payments, admin features, ID cards and email, sub-events, event subdomains,
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
- **QR payload today is unsigned** base64 JSON (`eventId`, `applicantID`,
  `registeredAt`); signing is planned with ID cards.

## Known gaps

- All client APIs are currently unauthenticated.
- Single timezone (server local); no overnight sessions.
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