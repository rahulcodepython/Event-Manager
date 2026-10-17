# IdentityCard — Test Results & Identified Issues

**Document Status:** Complete Test Results & Issues Remediation Log  
**Last Updated:** 2026-10-16  
**Scope:** Complete Codebase (`apps/server`, `apps/web`, `apps/admin`, `apps/landing`, `infra`, `tests`)

---

## 1. Executive Summary of Testing & Auditing

All test suites were executed across the codebase. Test isolation has been 100% achieved: **zero test files reside inside application or logical source directories (`apps/`), and all tests reside strictly within the root `tests/` directory.**

- **Total Test Suites Executed:** 62 tests across 24 test files
  - `tests/server/unit/`: 15 unit tests
  - `tests/server/integration/`: 11 integration test files (8 API lifecycle suites + 3 core architecture tests)
  - `tests/server/e2e/`: 3 comprehensive end-to-end user journey tests
  - `tests/web/`: 21 tests across 6 files
  - `tests/admin/`: 7 tests across 2 files
  - `tests/landing/`: 5 tests across 2 files
- **Pass Rate:** **100% Pass** (62 passing, 0 failing, 0 skipped)
- **TypeScript Typecheck:** **100% Pass** across `web`, `admin`, `landing` (`tsc --noEmit` exited 0)
- **Go Binary Compilation:** **100% Pass** across all server entry points (`cmd/server`, `cmd/admin`, `cmd/sites`, `cmd/seed`)

---

## 2. Core Architectural & Specific Checks Results

| Check ID | Area / Subject | Status | Findings / Assessment |
|---|---|---|---|
| **CHK-JWT-01** | JWT Inline Token Refresh / Transparent Renewal | **PASSED & VERIFIED** | Validated via `TestAuth_InlineTransparentRenewalViaMiddleware` in `tests/server/integration/auth_integration_test.go`. When an access token expires, `jwtauth.Authenticate` intercepts the request, uses the refresh token in Redis to rotate credentials, sets new `Set-Cookie` headers on the HTTP response context, and transparently returns HTTP 200 without rejecting the client. |
| **CHK-CACHE-01** | Redis Cache Anti-Stampede Jitter | **PASSED & VERIFIED** | Validated via `TestAddJitter_RangeAndDistribution` (2,000 randomized iterations). Jitter enforces $\pm 20\%$ variance with high entropy and mean convergence. Nil-cache fallback (`TestRemember_GracefulDegradationOnNilCache`) validated. |
| **CHK-RL-01** | Redis Token Bucket Rate Limiter | **FIXED & VERIFIED** | Validated via `TestRateLimiter_RedisTokenBucketEnforcement` in `tests/server/integration/rate_limiter_integration_test.go`. Added missing `ExposeHeaders` in `apps/server/internal/router/shared.go` (`X-RateLimit-Limit,X-RateLimit-Remaining,Retry-After`). The rate limiter decrements tokens per client IP, exposes rate headers, and responds with HTTP 429 and `Retry-After` on exhaustion. |
| **CHK-SEAT-01** | Seat Booking Concurrency Lock | **VERIFIED & ANALYZED** | Validated via `TestSeatBooking_ConcurrentContentionExactCap`. Verified race-condition immunity under synchronized burst concurrency. Evaluated trade-off: PostgreSQL transaction-level advisory locking provides absolute consistency but risks DB pool starvation during flash ticket sales; Redis atomic decr counter provides $\mathcal{O}(1)$ pre-check. |
| **CHK-CONF-01** | Third-Party Service Configurations | **VERIFIED** | Centralized in `.env` without hardcoded secrets. Verified connection settings for Redis, PostgreSQL, Razorpay, Resend Mailer, and MinIO S3 storage. |

---

## 3. Test Cases Execution Matrix

### 3.1 Server Unit Testing Results (`tests/server/unit/`)

| Test ID | Test Function | Target | Result | Duration |
|---|---|---|---|---|
| **TC-U-SRV-001** | `TestJWT_SigningAndParsing` | JWT Signing & Claims (`Issue`) | PASS | 0.00s |
| **TC-U-SRV-002** | `TestAddJitter_RangeAndDistribution` | Cache Jitter Range ($\pm 20\%$) | PASS | 0.00s |
| **TC-U-SRV-003** | `TestAddJitter_EdgeCases` | Cache Jitter Zero & Negative TTL | PASS | 0.00s |
| **TC-U-SRV-004** | `TestRemember_GracefulDegradationOnNilCache` | Cache Nil-Redis Graceful Fallback | PASS | 0.00s |
| **TC-U-SRV-005** | `TestVerify` | Google ID Token RSA Verification | PASS | 0.21s |
| **TC-U-SRV-006** | `TestGenerateApplicantUserID_Format` | Applicant User ID Format (`8-8-8`) | PASS | 0.00s |
| **TC-U-SRV-007** | `TestGenerateApplicantUserID_Uniqueness` | Applicant User ID Uniqueness (1,000 IDs) | PASS | 0.00s |
| **TC-U-SRV-008** | `TestRender` | A6 PDF Card Generator (`Render`) | PASS | 0.01s |
| **TC-U-SRV-009** | `TestProcess` | Photo ($600\times 600$) & Signature Processing | PASS | 0.08s |
| **TC-U-SRV-010** | `TestFeaturePrice` | Tiered, Per-Unit, Flat Pricing Calculation | PASS | 0.00s |
| **TC-U-SRV-011** | `TestTaxOn` | 18% GST Rounding Calculation | PASS | 0.00s |
| **TC-U-SRV-012** | `TestCouponDiscount` | Coupon Discounts & Subtotal Caps | PASS | 0.00s |
| **TC-U-SRV-013** | `TestSignVerify` | HMAC-SHA256 Signed QR Tokens | PASS | 0.00s |
| **TC-U-SRV-014** | `TestRateLimiter_DockerProxyClientIPExtraction` | Proxy Client IP Extraction | PASS | 0.00s |
| **TC-U-SRV-015** | `TestReadZip` | Zip Validation & Path Traversal Guard | PASS | 0.01s |

---

### 3.2 Server Integration Testing Results (`tests/server/integration/`)

| Test ID | Test Function | Target Endpoints / Checks | Result | Duration |
|---|---|---|---|---|
| **TC-INT-001** | `TestAuth_InlineTransparentRenewalViaMiddleware` | Middleware Transparent Access Token Rotation | PASS | 1.10s |
| **TC-INT-002** | `TestRateLimiter_RedisTokenBucketEnforcement` | Redis Lua Script Token Bucket & HTTP 429 | PASS | 0.00s |
| **TC-INT-003** | `TestSeatBooking_ConcurrentContentionExactCap` | Seat Booking Race Protection Under Concurrency | PASS | 0.00s |
| **TC-INT-004** | `TestAPI_AuthEndpoints` | `/auth/google`, `/auth/me`, `/auth/logout` | PASS | 0.01s |
| **TC-INT-005** | `TestAPI_PricingAndCreditsEndpoints` | `/pricing/catalog`, `/pricing/quote`, `/credits`, `/credits/trial` | PASS | 0.02s |
| **TC-INT-006** | `TestAPI_EventsAndDatesLifecycle` | `/events`, `/events/:id`, `/events/:id/dates/override`, `/events/:id/dates` | PASS | 0.05s |
| **TC-INT-007** | `TestAPI_FormsAndApplicantsLifecycle` | `/forms`, `/events/:id/form`, `/applicants/schema`, `/applicants`, `/applicants/bulk`, `/applicants/:id/qr`, `/applicants/:id/card` | PASS | 0.10s |
| **TC-INT-008** | `TestAPI_ApplyFlowLifecycle` | `/public/apply/:id/state`, `/draft`, `/submit`, `/events/:id/application-fee`, `/drafts` | PASS | 0.08s |
| **TC-INT-009** | `TestAPI_DevicesAndAttendanceLifecycle` | `/devices`, `/devices/verify`, `/devices/me`, `/attendance/scan`, `/attendance/entry`, `/attendance/exit`, `/analysis/metrics` | PASS | 0.12s |
| **TC-INT-010** | `TestAPI_SubeventsSitesPayoutsLifecycle` | `/sub-event-settings`, `/sub-events`, `/site/check`, `/site`, `/payouts`, `/public/contact` | PASS | 0.09s |
| **TC-INT-011** | `TestAPI_AdminGovernanceLifecycle` | Admin `/auth/login`, `/dashboard`, `/clients`, `/clients/:id/suspend`, `/catalog`, `/categories`, `/transactions`, `/coupons` | PASS | 0.05s |

---

### 3.3 End-to-End (E2E) Testing Results (`tests/server/e2e/`)

| Test ID | Test Function | User Journey & Flow Description | Result | Duration |
|---|---|---|---|---|
| **TC-E2E-001** | `TestE2E_OrganizerCompleteLifecycle` | Onboarding -> Claim Trial -> Event Creation -> Date Overrides -> Custom Form Designer -> Lock Form -> Add VIP & Bulk Applicants -> Sub-Event Workshop Enrollment -> Website Entitlement Check -> Card PDF Generation -> Close Application Window -> Publish Cards | PASS | 0.20s |
| **TC-E2E-002** | `TestE2E_ApplicantToScannerJourney` | Public Form Discovery -> Google Sign-in -> Draft Auto-Save -> Submission Confirmation -> Signed QR Delivery -> Gate Scanner Pairing via PIN -> Entry Gate Scan -> Duplicate Entry Rejection -> Checkout at Exit Gate -> Real-Time Attendance Analytics Update | PASS | 0.20s |
| **TC-E2E-003** | `TestE2E_PlatformGovernanceAndSecurity` | Admin Login -> Health & Revenue Dashboard -> Promotional Coupon Creation -> Client Inspection -> Immediate Client Suspension -> Active Session Revocation Verification -> Unsuspend Client -> Access Restored -> Coupon Cleanup | PASS | 0.09s |

---

### 3.4 Frontend Unit Testing Results (`tests/web/`, `tests/admin/`, `tests/landing/`)

| Test Suite | File | Tests / Specifications | Result | Duration |
|---|---|---|---|---|
| **Web Money** | `tests/web/money.test.ts` | Whole rupee formatting, fractional rupee decimals, large amounts | 3 PASS | 2.69ms |
| **Web Dates** | `tests/web/date-utils.test.ts` | Local `YYYY-MM-DD` formatting, month keys, inclusive ranges, 12h AM/PM | 5 PASS | 5.34ms |
| **Web CSV** | `tests/web/csv.test.ts` | RFC 4180 parsing, quoted commas, escaped quotes, object mapping, serialization | 4 PASS | 0.31ms |
| **Web Query Keys** | `tests/web/query-keys.test.ts` | React Query key factory consistency across all domain entities | 3 PASS | 0.02ms |
| **Web Form Builder** | `tests/web/form-builder.test.ts` | Mandatory system fields check, duplicate keys detection, image field single-instance guard | 4 PASS | 0.19ms |
| **Web Attendance State** | `tests/web/attendance-state.test.ts` | Offline scan queue, pending sync counts, attendee punctuality calculation | 2 PASS | 0.35ms |
| **Admin Format** | `tests/admin/admin-format.test.ts` | Admin dates, rupees/paise conversions, localized money formatting | 4 PASS | 8.15ms |
| **Admin State** | `tests/admin/admin-state.test.ts` | Basis points to percentage conversion, coupon payload validation, invalid inputs rejection | 3 PASS | 0.12ms |
| **Landing Calculator** | `tests/landing/pricing-calculator.test.ts` | Site metadata integrity, navigation structure, paise/rupee conversion | 2 PASS | 0.20ms |
| **Landing Quote Engine** | `tests/landing/quote-engine.test.ts` | Tiered pricing calculation, sub-events addons, custom branding, website addons, coupon discounts, 18% GST calculation | 3 PASS | 0.25ms |

---

## 4. Identified Findings & Remediations Breakdown

During testing and QA auditing, observations were categorized into three distinct buckets:

### Category A: Application Code Defect (Resolved Directly in Codebase)

#### Finding 1: Missing CORS `ExposeHeaders` for Rate Limiting
- **Location:** [`apps/server/internal/router/shared.go`](file:///home/rahulcodepython/Workspace/IdentityCard/apps/server/internal/router/shared.go#L58-L64)
- **Symptom:** Web and admin frontend clients were unable to read `X-RateLimit-Limit`, `X-RateLimit-Remaining`, or `Retry-After` HTTP response headers in the browser due to CORS restrictions.
- **Root Cause:** Fiber's `cors.New(...)` middleware did not include `ExposeHeaders`.
- **Code Solution:** Added `ExposeHeaders: "X-RateLimit-Limit,X-RateLimit-Remaining,Retry-After"` to `cors.Config`. This is the single application code modification required.

---

### Category B: Core Domain Logic & Invariants (Working Exactly as Designed)
These represent intentional backend business constraints that rejected non-compliant payloads as designed:

#### Finding 2: Event Dates Time Format Validation
- **Location:** [`apps/server/internal/features/events/dates/dates.entities.go`](file:///home/rahulcodepython/Workspace/IdentityCard/apps/server/internal/features/events/dates/dates.entities.go#L31-L35)
- **Observation:** `POST /api/v1/events/:id/dates/override` returned 400 Bad Request when sent timestamps formatted with seconds (`09:00:00`).
- **Design Logic:** The entity model strictly defines `validate:"required,datetime=15:04"`, intentionally requiring `HH:MM` 24-hour time notation. Verified as working as intended.

#### Finding 3: Mandatory System Fields on Event Forms
- **Location:** [`apps/server/internal/features/forms/forms.helper.go`](file:///home/rahulcodepython/Workspace/IdentityCard/apps/server/internal/features/forms/forms.helper.go#L18-L56)
- **Observation:** `POST /api/v1/events/:id/form` rejected form schemas missing `name`, `email`, or `phone`.
- **Design Logic:** The server intentionally enforces that default identity fields are immutable system fields (`is_system: true`) that cannot be deleted by organizers. Verified as working as intended.

#### Finding 4: Unlocked Form Public Registration Guard
- **Location:** [`apps/server/internal/features/register/register.queries.go`](file:///home/rahulcodepython/Workspace/IdentityCard/apps/server/internal/features/register/register.queries.go)
- **Observation:** Public registration returned 404 for newly created events.
- **Design Logic:** By architectural design, newly created forms remain in draft mode. The public registration query enforces `WHERE ef.id = $1 AND ef.is_locked = true`. Organizers must call `POST /api/v1/events/:id/form/lock` to publish the registration form. Verified as working as intended.

#### Finding 5: Card Publishing Window State Machine
- **Location:** [`apps/server/internal/features/cards/cards.services.go`](file:///home/rahulcodepython/Workspace/IdentityCard/apps/server/internal/features/cards/cards.services.go)
- **Observation:** `POST /api/v1/events/:id/cards/publish` returned 409 Conflict when applications were still open.
- **Design Logic:** To eliminate race conditions between concurrent applicant admissions and card generation, the server requires the application window to be closed (`POST /api/v1/events/:id/cards/close`) before publishing ID cards. Verified as working as intended.

---

### Category C: Test Harness & Protocol Nuances (Encountered During Test Execution)

#### Finding 6: RFC 7519 JWT Second-Precision Expiration
- **Observation:** In unit tests, sub-second token expirations (e.g. 50ms) did not reliably trigger token expiration.
- **Root Cause:** Standard JWT `NumericDate` uses whole integer seconds. Sub-second durations round down within the same second. Resolved in tests by using whole-second negative offsets (`exp = now.Add(-1 * time.Second)`).

#### Finding 7: Device Fingerprint Database Unique Constraint
- **Observation:** Repeated test runs failed with unique constraint violations on `devices_fingerprint_key`.
- **Root Cause:** Test payloads were reusing static fingerprint strings against PostgreSQL. Resolved by using dynamic UUIDs in test runs.

#### Finding 8: Fiber Mock Test IP Rate Limit Bucket Sharing
- **Observation:** Sequential API integration calls in `app.Test()` hit HTTP 429 prematurely.
- **Root Cause:** In Fiber's test harness, all mock requests originate from `0.0.0.0`, exhausting the single mock IP token bucket. Resolved by setting simulated client IPs per request.
