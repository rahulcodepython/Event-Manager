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

### Phase 1 — Client login and organization scoping ✅ done
- Google login in the Go API. Access JWT (15 min) + refresh JWT (7 days, sliding) in `HttpOnly` cookies. Refresh tokens tracked in Redis: single use, 30 s grace, reuse revokes all sessions.
- Onboarding form after first login creates the client's one organization.
- `events`, `form_templates`, `devices` carry `organization_id`; ownership middleware guards every id-addressed route.
- Scanner devices keep their own device auth and belong to an organization.
- Single root `.env` for all apps and Docker Compose; Redis password; Razorpay and Resend keys reserved.

### Phase 2 — Feature catalog and pricing engine ✅ done
- Tables `features`, `feature_options` (preset choices), `feature_rates` (base prices) and a single-row `pricing_settings` (currency, base fee, tax name and rate). Seeded with placeholder INR prices in migration `000010_pricing`.
- Each feature has a pricing type: `flat` (on/off), `per_unit` (price × ceil(value / unit_size)) or `tiered` (band price). The active rate whose range holds the value decides the price; no matching rate means free.
- Total = base fee + sum of feature prices, then GST 18% (exclusive) on top. Amounts in paise.
- Duration = maximum event length in days. Sub-events = number allowed. Branding = on/off.
- Public endpoints: `GET /pricing/catalog` (features, options, price per option) and `POST /pricing/quote` (line items, subtotal, tax, total). A feature left out of a quote uses its default; unknown keys or values outside the options are rejected.

### Phase 3 — Credits and payments ✅ done
- **Duration = credit validity window**: purchase date → purchase date + duration days. An event's dates must fit inside it. Unused credits expire at the end date.
- **One event per credit at a time.** Deleting the event frees the credit for a new one while the credit is still valid.
- **Free trial**, offered once in a step after onboarding (claim or skip; skipping is final). Trial values live in `features.trial_value` (25 applicants, 15-day window, branding, 3 sub-events, 0 backup days) and `pricing_settings.trial_max_event_days` (5). Trial events are test-only and deleted when the trial ends.
- **Purchase**: name the credit, pick options, live server quote, Razorpay Checkout. The server creates the order for the quoted amount, verifies the checkout signature, and a signed webhook (`POST /payments/razorpay/webhook`) also confirms payments. Fulfilment is idempotent; the credit and its `credit_features` are created from the stored quote.
- Credits page (rename, create event from a credit), credit picker in the create-event dialog, trial banner on trial events.
- Admin refunds and the income ledger (`transactions`): done in Phase 5.

### Phase 4 — Feature enforcement and data pruning ✅ done
- `credit_entitlements` SQL view flattens a credit's limits (applicants, branding, sub-events, backup days, prune date); Go reads it via `internal/pkg/entitlements`.
- **Applicants:** one capped insert (`applicants.InsertApplicant`) for dashboard, bulk upload and the public form, serialized per event with an advisory lock. Bulk upload accepts rows up to the limit and reports the rest. The public form's capacity can be lower than, never above, the credit limit (`-1` = credit limit). The Redis registration queue/worker was removed.
- **Read-only after the credit ends:** all writes under `/events/:eventId` and device scans return 403; reads and deleting the event still work.
- **Branding:** event logo on the public form and no "Powered by IdentityCard" footer. ID cards and emails follow in Phase 6.
- **Pruning:** hourly job in the API (Redis lock, also runs at startup) deletes events whose credit ended more than its backup days ago, with all their data and orphaned applicants. Credits stay as history. In-app notices show the deletion date; email reminders come in Phase 6.
- Sub-event limit is enforced in Phase 7.

### Phase 5 — Admin server and admin web UI ✅ done
- **Login:** one admin account from env (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, min 12 chars), no 2FA. Same cookie session as clients via the shared `internal/pkg/jwtauth` (own secrets `ADMIN_JWT_*`, `admin_` cookies, `admin` audience). 5 failed logins per IP per 15 min.
- **Admin web:** separate Next.js app `apps/admin` on :3001, talking to the admin API on :8001.
- **Dashboard:** revenue (payments − refunds), expenses, profit (this month and all time), 12-month income vs expense chart, client / credit / active-event counts, renewals due, recent payments.
- **Clients:** search and status filter; detail with credits, events, payments. Actions: suspend/restore (blocks login and revokes sessions, closes public forms and scanners), reset the trial choice, grant a free credit (kind `granted`).
- **Refunds:** the admin marks a paid payment refunded (money is returned in the Razorpay dashboard). The credit ends now (`revoked_at`); its event goes read-only and is pruned after its backup days. A refund row goes into the ledger.
- **Catalog:** edit settings (base fee, GST, trial event length) and each existing feature's text, pricing type, default, trial value, options and rates. Feature keys and the feature set are fixed. Old credits keep their purchase snapshot.
- **Ledger (`transactions`):** client payments (written by fulfilment) and refunds are automatic; manual income and expense entries with admin-managed categories.
- **Business subscriptions:** CRUD; the admin confirms each renewal, which records an expense and moves the due date by the interval.

### Phase 6 — ID cards, email and signed QR ✅ done
- **Signed QR:** `IC1.<payload>.<HMAC-SHA256>` (`internal/pkg/qrsign`, `QR_SIGNING_SECRET`). Scanners send the QR text; the server verifies it and checks the event. Unsigned QR codes are rejected.
- **Card:** one fixed A6 PDF design (`internal/pkg/idcard`): event name and dates, applicant name and ID, QR, venue, organizer. Branding adds the event logo and drops "Powered by IdentityCard". No photo. Generated on demand, never stored.
- **Schedule:** the form's closing date (`expires_at`) ends the application window; after it applicants cannot be added or deleted. Cards are emailed at `cards_publish_at`, which defaults to and follows the closing date and can never be earlier. Until cards are published the organizer can move both dates (a future closing date reopens the window) or close / publish manually. After publishing the schedule is frozen.
- **Delivery:** Resend, PDF attachment only (no link). One Redis-stream queue (`internal/pkg/jobqueue`) for all email, paced under Resend's 2 req/s, 5 attempts with backoff, crash-safe reclaim; per-applicant `card_status` (pending / queued / sent / failed). Resend one, failed, or all after publishing. The organizer can download any card from the dashboard.
- **Client reminders:** 1 day before the credit ends, 7 days before data deletion (backup > 7 days) and 1 day before deletion; each sent once (`credit_reminders`).

### Phase 7 — Sub-events ✅ done
- **What:** smaller events inside an event (`sub_events`): name, description, venue, optional hard cap, and their own days with hours (stored in `event_dates` with `sub_event_id`, which must fall inside the event's dates).
- **Limit:** the catalog feature `sub_events` (renamed "Number of sub-events") is how many sub-events an event can have; 0 disables them.
- **Joining** (`sub_event_applicants`, one applicant row per email):
  - organizer assigns event applicants;
  - the registration form offers sub-events: off / pick one / pick any number, optionally required;
  - a per-sub-event public link (the event form with that sub-event fixed); an email already registered is enrolled instead of refused.
  - Caps are hard for everyone. Enrollment is frozen once applications close, like applicants.
- **Attendance:** the scanner switches to a sub-event; only enrolled applicants pass, entry/exit per sub-event day. Analysis can be filtered to one sub-event; the event's own figures exclude sub-event attendance.
- **ID card** lists the applicant's sub-events.

### Phase 8 — Event subdomain sites ✅ done
- **Feature:** new catalog feature "Event website" (`event_site`, on/off, flat price; placeholder ₹999 and trial 0, set in admin).
- **Subdomain:** `<slug>.<SITES_DOMAIN>`, a domain separate from the app. 3–40 chars `a-z 0-9 -`, no `--`, reserved names; changeable anytime (old name freed at once); freed when the event is deleted or pruned.
- **Upload:** zip with `index.html` at the top (or in one folder), 10 MB / 300 files, HTML/CSS/JS/images/fonts/JSON. Each upload replaces the site: new files go to a fresh version folder, the site switches in one update, the old folder is deleted. Files live in S3-compatible storage (MinIO locally, R2/S3 in production).
- **Serving:** third binary `cmd/sites` (`SITES_PORT`, 8002) maps the Host to a site; `/register` and `/register/<sub-event id>` redirect to the registration form. Online until the credit ends (then an "event ended" page). Caddy on-demand TLS asks `/__tls-check` so certificates are issued only for existing sites.

### Phase 9 — Landing page app ✅ done
- `apps/landing` (Next.js, port 3002, same design system): home (hero, how it works, features, FAQ, contact), pricing calculator (catalog rendered on the server every 5 min, live quotes from `/pricing/quote`), contact page, and placeholder Terms, Privacy and Refund policy.
- Placeholder copy and company details live in `apps/landing/lib/site.ts` and `lib/content.ts`.
- Sign-up and login buttons go to the app's Google login (`NEXT_PUBLIC_WEB_URL/login`).
- Contact form: `POST /public/contact` (honeypot field, 5 messages per IP per hour), stored in `contact_messages` and emailed to `CONTACT_EMAIL` through the email queue.
- The client API allows the landing origin (`LANDING_URL`) in CORS.

### Phase 10 — Coupons ✅ done
- **Admin** creates coupons: percent (optional max discount) or flat ₹; valid from/until; total uses; uses per client; minimum order. Used coupons cannot be deleted, only deactivated.
- **Discount** comes off the subtotal (base fee + features); GST is charged on the rest (`pricing.ApplyCoupon`).
- **Where:** the buy-credit page (applied to the real order) and the landing calculator (preview, `coupon_code` on `/pricing/quote`; per-client limits are checked only at purchase).
- **Counting:** a use counts when the purchase is paid; refunds keep the use. Limits are checked when the order is created, so two simultaneous purchases can exceed a limit by one.
- **Zero total:** Razorpay cannot take ₹0, so a fully discounted purchase skips Razorpay: the credit is created at once, recorded as a ₹0 paid payment with the coupon, and our own receipt is emailed.

### Phase 11 — Applicant Google sign-in, drafts and application fees ✅ done

**Goal.** Every public application starts with "Continue with Google". The application is a server-side **draft** that auto-saves; the applicant can reload or come back later and resume at the last finished step. A draft becomes a real applicant only when it is confirmed: at the end of the form when there is no fee, or when the payment succeeds.

**Applicant sign-in (per form, not an account).**
- Google sign-in with Google Identity Services ("Sign in with Google" button, same OAuth client as organizer login). The button runs in popup mode; where popups are blocked (mobile in-app browsers) it falls back to redirect mode, where Google POSTs the ID token to our callback, `APPLICANT_GOOGLE_LOGIN_URI`.
- The API verifies the Google ID token (signature against Google's keys, audience = `GOOGLE_CLIENT_ID`, issuer, expiry, `email_verified`).
- Name, email and Google profile picture come from Google and are **required and read-only**. The email is the applicant's identity for this form. The picture is the applicant's photo unless the form has a Photo field.
- The API then sets a short-lived HttpOnly cookie (`applicant_session`, scoped to the public apply API, 24 h) holding the form id + Google `sub` + email (signed). A reload resumes without signing in again; when it expires the applicant clicks Google again and lands on the same draft.
- No applicant accounts, passwords or profiles beyond this.

**Drafts.**
- New table `application_drafts`: form, event, Google `sub`, email, name, picture, answers (JSON), image tokens, sub-event choices, `current_step`, status (`draft` → `awaiting_payment` → `confirmed`), payment reference, timestamps. Unique per (form, Google `sub`) and per (form, email).
- Auto-save after every step (and on field blur): `PUT /public/apply/:formId/draft`. Server validates each step's fields as they are saved, and the whole form again on confirm.
- Already registered for this form → show the registration (applicant id, card status) instead of a new form.
- Abandoned drafts are deleted after 7 days, or when the application window closes, with their pending images (sweep job).

**Steps.**
1. Sign in with Google (name, email, picture filled).
2. Form fields (the organizer's form; name and email are not asked again).
3. Review.
4. Payment — only when the form has a fee.
5. Done: confirmation screen + confirmation email.

**Confirmation (draft → applicant).**
- Free form: "Submit" on the review step runs the existing capped insert (`applicants.InsertApplicantTx`, sub-event enrollment, image claim) in one transaction and marks the draft `confirmed`.
- Paid form: the same conversion runs when the payment is confirmed (Razorpay webhook, the checkout callback, or a status check), exactly once.
- Capacity, application window and credit checks run again at conversion.

**Application fees (Razorpay).**
- Organizer sets one fee on the event form ("Application Fee" on the form page; ₹1 minimum, 0 = free). A fee needs an active payout account.
- "Pay" creates one Razorpay order per draft (reused if the applicant retries; amount always computed on the server).
- **Seat hold:** a draft in `awaiting_payment` holds a seat for 15 minutes so a full event cannot take more payments than seats; expired holds free the seat.
- **Reload during or after payment:** on load, a draft with an open order asks Razorpay for the order's status; if it is paid, the draft is converted there and then (no wait for the webhook). The confirmation email covers the case where the applicant closed the tab.
- A payment that arrives after its seat hold expired and the event is full is refunded automatically.
- Payouts through Razorpay Route (see Decisions).

**Organizer side.**
- Form page: "Application Fee" dialog.
- Dashboard → Payouts: Route onboarding (business, address, bank) and the account status.
- Applicants list: only confirmed applicants, a "Paid" column, "Refund & Remove" (with a reason) for paid applicants; plain delete is refused for them. "In Progress" lists drafts, applicants paying and refunds.
- The platform's share (`PLATFORM_FEE_PERCENT`) is written to the admin ledger as source `application_fee` (and reversed on refund).

**What changes for existing behaviour.**
- The single-page public form is replaced by the step flow on every form.
- Dashboard manual add and bulk upload are unchanged (organizer-entered, no Google, no fee).

**Configuration (all in the root `.env`, nothing hard-coded).**

| Variable | Value (dev) | Used for |
|---|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | existing | organizer login and applicant sign-in |
| `GOOGLE_REDIRECT_URL` | `${API_URL}/api/v1/auth/google/callback` | organizer login callback (exists today) |
| `APPLICANT_GOOGLE_LOGIN_URI` | `${API_URL}/api/v1/public/apply/google/callback` | applicant sign-in callback (redirect mode) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `${GOOGLE_CLIENT_ID}` | the sign-in button in the browser |
| `APPLICANT_SESSION_TTL` | `24h` | applicant cookie lifetime |
| `APPLICATION_SEAT_HOLD` | `15m` | seat hold at the payment step |
| `APPLICATION_DRAFT_TTL` | `168h` | unfinished drafts are deleted after this |
| `APPLICANT_SESSION_SECRET` | random | signs the applicant cookie |
| `GOOGLE_CERTS_URL` | `https://www.googleapis.com/oauth2/v3/certs` | Google keys for ID-token checks |
| `APPLICATION_DRAFT_SWEEP_EVERY` | `1h` | how often stale drafts are deleted |
| `APPLICANT_SIGNIN_TTL` | `10m` | a started sign-in (nonce cookie) stays valid this long |
| `NEXT_PUBLIC_GOOGLE_GSI_SCRIPT_URL` | `https://accounts.google.com/gsi/client` | Google sign-in script in the browser |
| `PLATFORM_FEE_PERCENT` | `5` (placeholder) | platform share of application fees |
| `RAZORPAY_V2_BASE_URL` | `https://api.razorpay.com/v2` | Route linked accounts (onboarding) |
| `RAZORPAY_ROUTE_CATEGORY`, `RAZORPAY_ROUTE_SUBCATEGORY` | `education`, `event_management` | business category of linked accounts |
| `PAYOUT_STATUS_REFRESH` | `5m` | a pending payout account re-checks its status this often |
| `RAZORPAY_BASE_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | existing | orders, payment status, refunds, Route transfers |
| `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_WEBHOOK_URL` | `${API_URL}/api/v1/payments/razorpay/webhook` | payment confirmations (one webhook for credits and application fees) |
| `NEXT_PUBLIC_RAZORPAY_CHECKOUT_URL` | `https://checkout.razorpay.com/v1/checkout.js` | checkout in the browser |

Google Cloud Console, on the OAuth client:
- **Authorized JavaScript origins:** `WEB_URL` (the public form runs there).
- **Authorized redirect URIs:** `GOOGLE_REDIRECT_URL` and `APPLICANT_GOOGLE_LOGIN_URI`.

Razorpay dashboard: webhook `RAZORPAY_WEBHOOK_URL` with events `payment.captured` and `order.paid` (refunds and transfers are recorded when we create them); Route enabled on the account.

**Build order.**
1. Google ID-token verification, applicant session cookie, `application_drafts`, auto-save + resume, confirm for free forms.
2. Step UI on the public form (sign-in, steps, review, done); Google picture as the photo on forms without a Photo field (card, scanner).
3. Fees: form settings, Razorpay orders per draft, webhook + status check, seat holds, expiry and refund of late payments.
4. Razorpay Route onboarding for organizers, payouts, organizer payment/refund views, ledger.

**Decisions.**
- Google sign-in is required on **every** public form; the single-page form is replaced by the step flow. No email-code fallback: no Google account, no application.
- The Google picture is the applicant's photo **on forms without a Photo field** (ID card, scanner). If the organizer added a Photo field, the uploaded photo is used instead (its minimum size still applies). Google pictures can be small or a letter avatar; that is accepted.
- Payouts through **Razorpay Route**: organizers onboard as linked accounts (KYC); each payment is transferred to the organizer minus Razorpay's fee and the platform fee (the organizer bears both; the applicant pays the listed fee).
- Refunds: the organizer can refund any paid applicant from the dashboard (the applicant is removed); payments that arrive when the event is already full are refunded automatically.
- Seat hold 15 minutes at the payment step; unfinished drafts are deleted after 7 days or when the application window closes, whichever is first.

- Platform fee: a percent of each application fee, `PLATFORM_FEE_PERCENT` in `.env`. Razorpay's own fee is also deducted from the organizer's transfer.
- One application fee per form; sub-events are free to join.
- Organizers onboard to Route in the dashboard (business + bank details → linked account created through Razorpay's API; status shown).
- After a refund the applicant is removed, their card stops working, and they get an email; signing in again shows "Refunded" (no re-apply).

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
4. **Branding.** What exactly does it unlock: the client's logo and colours on forms, cards and emails? Removal of platform branding?
6. **Pruning.** Delete everything (applicants, attendance, form, event), or keep the event shell? Warn the client by email N days before? Offer an export first?
7. **Feature keys.** OK that enforcement code refers to features by a fixed `key` (e.g. `applicants`), while names, prices and limits stay editable from admin? A brand new feature added from admin would only affect price until code enforces it.
8. ~~**Apps**~~ Decided: `apps/admin` and `apps/landing` are separate Next.js apps.

### Auth and payments
11. ~~**Admin login**~~ Decided: single account from env, no 2FA.
12. ~~**Business subscriptions**~~ Decided: the admin confirms each renewal.

### ID cards
13. ~~**Card design**~~ Decided: one fixed design.
14. ~~**Photo**~~ Decided: no photo.
15. ~~**Delivery**~~ Decided: PDF attachment by Resend at the card publishing date, after applications close.

### Sub-events
16. ~~Sub-events~~ Decided (see Phase 7).

### Subdomains
17. ~~**Site content**~~ Decided: uploaded static sites on a separate domain (see Phase 8).

### Coupons
18. ~~**Coupon types**~~ Decided (see Phase 10).

### Housekeeping
21. Is the phase order in section 4 right? In particular, should ID cards (Phase 6) come before the admin apps (Phase 5)?
