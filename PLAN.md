# IdentityCard — Product & Build Plan (DRAFT v2)

Status: **draft. Phases are ordered high → low priority. Each phase starts only
after its open questions (section 6) are answered.**
Last updated: 2026-10-15.

---

## 1. Decisions made

| # | Decision |
|---|---|
| D1 | No team members or roles. One login per client. |
| D2 | No multi-organization. **One client = one organization.** |
| D3 | One unique subdomain per **event** (e.g. `hello.xyz.com` opens that event's landing page). |
| D4 | No native mobile app. |
| D5 | Pricing is per **credit**. 1 credit = 1 event. The client configures the credit's features at purchase, sees the total, pays, then uses it. |
| D6 | Initial features: **number of applicants, branding, duration, sub-events, backup duration after the event ends**. After the backup duration, event data is pruned automatically. |
| D7 | Features are data, not columns: a `features` table seeded with defaults, a rates table for base prices, and **junction tables** linking credits to feature values. No table attribute named after a specific feature. |
| D8 | Each credit gets a client-chosen **name**. An event is created by picking a credit, either from the event create form or from the credits page. |
| D9 | Coupons are planned for later and apply at purchase. |
| D10 | Three new apps: **landing page** (Next.js), **admin server** (Go, `apps/server/cmd/admin`), **admin web UI** (Next.js). |
| D11 | Admin can see dashboard, revenue, clients, each client's events and purchases, and total income. Admin manages coupons, features, feature rates and prices. |
| D12 | Transactions page: client payments are income. Manual income and expense entries. Business subscriptions (e.g. domain renewals) are tracked and recorded as expenses. |
| D13 | Server layout: `cmd/server/main.go` (client API) and `cmd/admin/main.go` (admin API). Features stay under `internal/features/`. Shared helpers are reused. Routers are named `app.router.go` and `admin.router.go`. |
| D14 | Remove API docs (`/docs`, Scalar page, OpenAPI stub) from the whole application. |

Dropped from v1: members/roles, multi-org, native app, annual retention fee
(`BILLING_REDESIGN_PROPOSAL.md`, replaced by backup duration — to be confirmed, Q19).

---

## 2. Current state (commit `fb30974`)

**Built:** events, dates, form templates and designer, event form with public
registration (Redis queue), applicants (manual, bulk upload, filters), devices
(PIN pairing, WebAuthn), scanning (entry/exit/verify, offline sync), analysis.

**Missing:** login of any kind (all APIs open), organization scoping, credits
and payments, ID cards and email, sub-events, event subdomains, landing page,
admin apps, coupons.

---

## 3. Proposed data model (to confirm in Q1–Q8)

Names are proposals. No column is named after a specific feature.

```
organizations           one row per client (D2); holds the client's login identity link

features                the catalog
  id, key (stable slug used by enforcement code, e.g. "applicants"),
  name, description, value_type (number | boolean | choice),
  unit (e.g. "applicants", "days"), min_value, max_value, step,
  default_value, is_active, sort_order

feature_rates           base prices per feature (shape depends on Q1)
  id, feature_id, <pricing columns per Q1>, effective_from, is_active

feature_options         only for value_type = choice (if needed)
  id, feature_id, value, label, sort_order

credits
  id, organization_id, name, status (unused | in_use | expired | pruned),
  subtotal, discount, total, currency, event_id (nullable, unique),
  purchased_at

credit_features         junction: what this credit includes
  credit_id, feature_id, value, unit_price_snapshot, line_total
  (price is copied at purchase so later rate changes don't alter old credits)

payments                gateway records
  id, organization_id, credit_id, gateway, gateway_order_id,
  gateway_payment_id, amount, status, created_at

transactions            the admin ledger (income and expense)
  id, direction (income | expense), source (payment | manual | subscription),
  category, amount, currency, occurred_on, note,
  payment_id (nullable), business_subscription_id (nullable)

business_subscriptions  admin's own recurring costs (domains, hosting, ...)
  id, name, vendor, amount, currency, billing_cycle, next_renewal_on, is_active

coupons / coupon_redemptions      (later phase)

event_sites             one subdomain per event (D3)
  id, event_id (unique), subdomain (unique), ...
```

**Enforcement** reads `credit_features` by `features.key`. Code must reference
a feature by its key somewhere to enforce it (e.g. "applicants" caps
registrations). Keys are seeded and stable; names, prices and limits stay
editable from admin. To confirm: Q7.

---

## 4. Phases (high → low priority)

### Phase 0 — Cleanup and server restructure ✅ done
- Remove API docs: `internal/router/docs.go`, `generic.RouteDocs`, the route registration, and doc references.
- Split routing: `internal/router/app.router.go` (client API) and `internal/router/admin.router.go` (admin API).
- Add `cmd/admin/main.go` on its **own port** (`ADMIN_PORT`, e.g. 8001), sharing config, Postgres, Redis, middlewares and utils with `cmd/server`.
- Makefile targets for both binaries.
- **Delete** `BILLING_REDESIGN_PROPOSAL.md` and `generic/pricing.go`.
- **Rewrite** `PROJECT_MEMORY.md` to match current code. Keep its Engineering Principles and TSX style sections. Update the READMEs.
- Convert the JSX in files changed by commit `fb30974` to the preferred conditional style. Fix the 3 existing lint errors.

### Phase 1 — Client login and organization scoping
- Client sign-up and login (method: Q9).
- One organization per client, created at sign-up.
- Every client table and query gets scoped by `organization_id`. Requests without a valid session are rejected.
- Scanner devices keep their own device auth, but are bound to an organization.

### Phase 2 — Feature catalog and pricing engine
- Tables `features`, `feature_rates` (and `feature_options` if needed), seeded with the 5 default features.
- Server-side quote endpoint: input is the feature values, output is line items and the total. The browser never computes the payable amount on its own.

### Phase 3 — Credits and payments
- Purchase form: feature inputs, live total from the quote endpoint, credit name, pay.
- Payment gateway integration (Q10) with webhook verification. The credit is created only after payment is confirmed.
- Credits page: list credits with features, status and linked event. "Create event" action from a credit.
- Event creation requires picking an unused credit. One credit maps to one event.
- Every confirmed payment writes an income row in `transactions`.

### Phase 4 — Feature enforcement and data pruning
- Applicants: cap across public registration, manual add and bulk upload.
- Duration: limits event dates (meaning: Q3).
- Sub-events: limits the number of sub-events (applies once Phase 7 exists).
- Branding: toggles client branding (meaning: Q4).
- Backup duration: scheduled job deletes event data N days after the event ends, with a prior warning (Q6).

### Phase 5 — Admin server and admin web UI
- Admin login (Q11).
- Dashboard: revenue, income vs expense, client count, credits sold, active events.
- Clients: list and detail with their events, credits and payments.
- Catalog: manage features, rates and prices.
- Transactions: payments (auto), manual income and expense entries.
- Business subscriptions: CRUD, with renewals recorded as expenses (Q12).

### Phase 6 — ID cards, email and signed QR
- Signed QR payload (HMAC) so cards can't be forged.
- Card design and PDF or image generation (Q13–Q15).
- Email delivery through a provider, with a queue, retries and a "resend" action.

### Phase 7 — Sub-events
- Design only after the sub-event questions are answered (Q16).

### Phase 8 — Event subdomain sites
- One subdomain per event, claimed in event settings, validated for uniqueness and reserved names.
- Serving method and safety depend on Q17.

### Phase 9 — Landing page app
- Public marketing site (Next.js): product, pricing calculator (uses the quote endpoint), sign-up.

### Phase 10 — Coupons
- Admin creates coupons. The client applies a coupon at purchase. The quote shows the discount.
- Redemptions are tracked and limits enforced (Q18).

---

## 5. Repo layout after the changes (proposal)

```
apps/
  server/
    cmd/server/main.go        client API
    cmd/admin/main.go         admin API (new)
    cmd/seed/main.go
    internal/
      features/<feature>/     shared by both binaries; admin-only features live here too
      router/app.router.go
      router/admin.router.go
      pkg/, utils/, middlewares/, config/, generic/, migrations/
  web/                        client dashboard (existing)
  admin/                      admin web UI (new, Next.js)
  landing/                    landing page (new, Next.js)
infra/
```

Q8 asks whether `admin` and `landing` should be separate apps like this.

---

## 6. Open questions

### Pricing and credits
1. **Rate shape.** How is a feature priced?
   - (a) Per unit: e.g. ₹X per 100 applicants, ₹Y per extra day.
   - (b) Tiers/bands: e.g. 1–100 = ₹A, 101–500 = ₹B.
   - (c) Boolean on/off price (e.g. branding).
   - (d) A mix, chosen per feature.
2. **Total formula.** Is the total a simple sum of each feature's price? Or does duration multiply other features?
3. **Duration.** Does it mean the length of the event (days between start and end), or how long the event stays usable? When does the clock start: purchase, or event start?
4. **Branding.** What exactly does it unlock: the client's logo and colours on forms, cards and emails? Removal of platform branding?
5. **Credit lifecycle.**
   - Does an unused credit expire?
   - Can the client upgrade a credit after purchase (e.g. more applicants)?
   - Refunds?
   - Is a first credit free?
6. **Pruning.** Delete everything (applicants, attendance, form, event), or keep the event shell? Warn the client by email N days before? Offer an export first?
7. **Feature keys.** OK that enforcement code refers to features by a fixed `key` (e.g. `applicants`), while names, prices and limits stay editable from admin? A brand new feature added from admin would only affect price until code enforces it.
8. **Apps.** Should the admin web and landing page be separate Next.js apps (`apps/admin`, `apps/landing`)? Or should landing live inside `apps/web`?

### Auth and payments
9. **Client login method:** email OTP, email + password, Google, or several? Keep better-auth, or Go-native auth?
10. **Payment gateway:** Razorpay? GST invoice needed? INR only?
11. **Admin login:** a single admin account from env/config, or an admin users table? 2FA?
12. **Business subscriptions:** should renewals create expense rows automatically on the due date, or does the admin confirm each renewal?

### ID cards
13. **Card design:** one fixed design, a few templates, or a designer? Which fields go on it?
14. **Photo:** applicant photo uploaded at registration? That needs file storage again (MinIO/S3).
15. **Delivery:** PDF attachment or link, and when to send (on registration, or on admin action)? Email provider: Resend, SES, or SMTP?

### Sub-events
16. Still open from v1 (Q24–Q33): real examples, own time slots and venue, how applicants pick, capacity, extra fields or fees, scanner per sub-event, admin edits. Answer these before Phase 7.

### Subdomains
17. **Site content:** uploaded static HTML, a built-in template page, or both? OK to use a separate domain for these sites (abuse safety)? Is the subdomain freed when the event's data is pruned?

### Coupons
18. **Coupon types:** percent and/or flat amount? Usage limits per coupon and per client? Expiry date? Restricted to certain features?

### Housekeeping
21. Is the phase order in section 4 right? In particular, should ID cards (Phase 6) come before the admin apps (Phase 5)?
