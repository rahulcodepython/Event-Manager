# E2E Fix Checklist

Fixes for the issues found in the browser E2E run on 2026-10-22.
Decisions taken with the owner are noted inline.

## High

- [x] H1 Public form photo/signature uploads send no cookie (401)
- [x] H2 Empty optional email/URL fields block submission (public form + manual add)
- [x] H3 Empty lists come back as `null` (admin pages spin/crash, scanner page crashes)
- [x] H4 "Override All Dates" returns 500 when a date already exists
- [x] H5 Attendance uses UTC instead of the event's local time — decision: per-event timezone, default from `APP_TIMEZONE`
- [x] H6 Scanner passkey enrolment needs the consumed PIN; passkey sign-in without a credential returns 500
- [x] H7 Device fingerprints collide for identical devices — decision: random per-browser ID
- [x] H8 Applicant photos/signatures blocked in the dashboard by `Cross-Origin-Resource-Policy: same-origin`
- [x] H9 "File Upload" field stores only the file name
- [x] H10 No UI to delete an event — decision: danger zone in event Settings
- [x] H11 Client IP empty for trusted peers without `X-Forwarded-For` — decision: fall back to the socket IP, no LAN ranges trusted by default

## Medium

- [x] M1 "Disconnect / Unpair Terminal" is client-only
- [x] M2 Server accepts select/radio/checkbox values that are not options
- [x] M3 Client dashboard home is an empty placeholder
- [x] M4 Add Applicant dialog renders Name/Email/Mobile twice
- [x] M5 Assign Devices dialog: clicking the checkbox does not select
- [x] M6 Form designer loses unsaved changes without warning
- [x] M7 Suspended organization's public form says "Deadline passed"
- [x] M8 Quote accepts a coupon the client has already used up
- [x] M9 Country list falls back to +91 only (restcountries redirect has no CORS)
- [x] M10 Capacity 0 saved as 1 — decision: reject (min 1); over-credit error is an unhandled rejection

## Low

- [x] L1 Review step / select trigger / applicant views show option values instead of labels
- [x] L2 Landing placeholders — decision: company name, email, address from `NEXT_PUBLIC_*` env; legal copy stays placeholder
- [x] L3 Trial card shows "Event duration 15 days" next to "Event length up to 5 days"
- [x] L4 "Skip and buy a credit" goes to the dashboard instead of the buy page
- [x] L5 Row actions (forms, events, applicants, devices) only via right-click
- [x] L6 Deleting a sub-event shows a stale "sub-event not found" toast
- [x] L7 Over-capacity enrolment toast gives no reason
- [x] L8 Bulk-upload template sample row misses required columns
- [x] L9 Scanner manual input placeholder says it accepts an applicant ID
- [x] L10 Read-only event still shows "Active" and an enabled Settings save
- [x] L11 Card schedule accepts dates after the event — decision: closing and publishing ≤ event end; disabled Save gives no reason
- [x] L12 Landing pricing revalidate (300s) hard-coded
- [x] L13 Small items: "1 uses", missing field labels, ₹0 order refund (decision: hide), Events/Forms page headings, system-field copy, field key hint, `nativeButton` warning on Event Not Found

## Found while verifying the fixes

- [x] V1 Event Settings rejected `Asia/Kolkata` (Chrome lists `Asia/Calcutta`); timezone check now accepts any name the browser resolves
- [x] V2 Event Settings reset to the values from first load after a save
- [x] V3 Applicant schema API dropped `is_system` and `validation`, so Add Applicant still showed Name/Email/Mobile twice
- [x] V4 Pair page kept showing the old session after unpairing (cached query)
- [x] V5 Deleting an event showed a stale "resource not found" toast

All items above were re-tested in the browser on 2026-10-22.

## Configuration added

| Key | Default | Purpose |
|---|---|---|
| `APP_TIMEZONE` | `Asia/Kolkata` | Default timezone of new events; database session timezone |
| `FILE_UPLOAD_MAX_MB` / `NEXT_PUBLIC_FILE_UPLOAD_MAX_MB` | `10` | Largest File Upload file |
| `TRUSTED_PROXIES` | empty (loopback only) | Reverse proxies whose `X-Forwarded-For` is trusted |
| `PRICING_CATALOG_REVALIDATE` | `300` | Landing pricing page catalog cache, seconds |
| `NEXT_PUBLIC_COMPANY_NAME` / `_EMAIL` / `_ADDRESS` | empty | Company details on the landing site |

Removed: `NEXT_PUBLIC_COUNTRIES_API_URL` (restcountries v3.1 is deprecated; the country list is bundled).

Migration: `000023_event_timezone` adds `events.timezone`.
