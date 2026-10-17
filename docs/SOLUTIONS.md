# IdentityCard — Architectural Solutions & Engineering Remediations

**Document Status:** Approved Technical Reference & Implementation Guide  
**Last Updated:** 2026-10-16  
**Scope:** Complete Codebase (`apps/server`, `apps/web`, `apps/admin`, `apps/landing`, `infra`, `tests`)

---

## 1. Test Architecture & Source Tree Isolation

### The Problem
The user's rule strictly mandates zero test files inside application source trees (`apps/server`, `apps/web`, `apps/admin`, `apps/landing`). However, Go's compiler strictly forbids any package outside the parent directory tree of `internal/` from importing packages containing `internal/` in their path (`use of internal package ... not allowed`).

### The Solution
1. **Dedicated Go Module & Isolated Testing:** The server codebase resides in `apps/server/internal/` and builds self-contained binaries (`cmd/server`, `cmd/admin`, `cmd/sites`).
2. **Dedicated Test Module in `tests/server`:** Created `tests/server/go.mod` with module name `identitycard-tests`, linked via root `go.work` to `./apps/server` and `./tests/server`.
3. **Clean Folder Partitioning:**
   - `tests/server/unit/`: Unit tests for crypto, math, pricing, formatting.
   - `tests/server/integration/`: API lifecycle integration tests against real PostgreSQL and Redis.
   - `tests/server/e2e/`: Multi-stage end-to-end user journeys (Organizer lifecycle, Attendee-to-scanner journey, Admin governance).
   - `tests/web/`, `tests/admin/`, `tests/landing/`: Frontend component, schema, date/money, and quote calculation unit tests.
4. **Single-Connection Pool Harness (`sync.Once`):** Prevents database connection exhaustion during multi-suite test runs by reusing a shared, pooled connection across all test executions.

---

## 2. Network Call & Database Round-Trip Minimization

### 2.1 Backend <-> Database: Single Round-Trip CTE JSON Builders
Every complex entity mutation is executed in a single SQL round-trip combining data modification and JSON response construction via PostgreSQL Common Table Expressions (CTE).

**Example: Event Creation with Metadata & Dates in 1 Round-Trip:**
```sql
WITH ins_event AS (
    INSERT INTO events (organization_id, credit_id, start_date, end_date)
    VALUES ($1, $2, $3, $4)
    RETURNING id, organization_id, start_date, end_date, created_at, updated_at
),
ins_meta AS (
    INSERT INTO event_metadata (id, name, venue)
    SELECT id, $5, $6 FROM ins_event
    RETURNING name, venue
),
ins_dates AS (
    INSERT INTO event_dates (event_id, date, start_time, end_time)
    SELECT id, d.date, d.start_time, d.end_time
    FROM ins_event, jsonb_to_recordset($7::jsonb) AS d(date date, start_time time, end_time time)
    RETURNING date, start_time, end_time
)
SELECT jsonb_build_object(
    'id', e.id,
    'name', m.name,
    'venue', m.venue,
    'start_date', e.start_date,
    'end_date', e.end_date,
    'dates', COALESCE((SELECT jsonb_agg(d.*) FROM ins_dates d), '[]'::jsonb)
)
FROM ins_event e, ins_meta m;
```

**Benefits:**
- Replaces 3 sequential network round-trips (`INSERT event` $\to$ `INSERT metadata` $\to$ `INSERT dates`) with exactly **1 round-trip**.
- Atomicity is guaranteed by the SQL engine without requiring external transaction management.
- Zero ORM impedance mismatch; Fiber streams the pre-serialized JSONB string directly to the client.

### 2.2 Cache-Aside with Stampede Prevention ("Jitter")
To prevent cache stampedes (where simultaneous cache misses hammer PostgreSQL), all cached keys utilize `RememberWithJitter`:
```go
func AddJitter(ttl time.Duration, jitterPercent float64) time.Duration {
    if ttl <= 0 || jitterPercent <= 0 {
        return ttl
    }
    pct := math.Min(jitterPercent, MaxJitterPercentage)
    factor := 1.0 + (rand.Float64()*2.0-1.0)*pct // e.g. 1.0 ± 0.20
    return max(time.Duration(float64(ttl)*factor), MinJitterTTL)
}
```
**Benefits:**
- Disperses cache eviction times across a continuous band ($\pm 20\%$).
- Concurrent readers never expire simultaneously, eliminating thundering herd spikes on PostgreSQL.

---

## 3. JWT Inline Token Refresh / Transparent Renewal via Middleware

### Implementation Design
Session management uses HttpOnly cookies:
- `ic_access`: 15-minute access token.
- `ic_refresh`: 7-day refresh token stored as an indexed session key in Redis.

When an access token expires:
1. `jwtauth.Authenticate` intercepts the incoming request in Fiber middleware.
2. It detects the access token expiration via `jwt.ErrTokenExpired`.
3. It retrieves the refresh token from `c.Cookies("ic_refresh")` and verifies its validity against Redis.
4. It issues a new access token, updates the refresh session timestamp in Redis, and sets new `Set-Cookie` response headers on `c`.
5. The request proceeds to the downstream handler immediately with HTTP 200 without rejecting the client with 401.

---

## 4. Redis Token Bucket Rate Limiter with CORS Headers

### Implementation Design
1. **Atomic Redis Lua Script:** Refills tokens using Redis's internal clock (`redis.call('TIME')`) and decrements in a single operation:
```lua
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local t = redis.call('TIME')
local now = tonumber(t[1]) + tonumber(t[2]) / 1000000
local state = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(state[1]) or capacity
local ts = tonumber(state[2]) or now
tokens = math.min(capacity, tokens + (now - ts) * rate)
local allowed = 0
if tokens >= 1 then
    tokens = tokens - 1
    allowed = 1
end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', KEYS[1], math.ceil(capacity / rate))
return {allowed, math.floor(tokens), tostring((1 - tokens) / rate)}
```
2. **CORS Header Exposure:**
`apps/server/internal/router/shared.go` was updated to explicitly expose the rate-limiting headers:
```go
cors.New(cors.Config{
    AllowOrigins: allowOrigins,
    AllowHeaders: allowHeaders,
    ExposeHeaders: "X-RateLimit-Limit,X-RateLimit-Remaining,Retry-After",
    AllowCredentials: true,
})
```

---

## 5. Seat Booking Concurrency: Redis Queue vs. PostgreSQL Advisory Locks

### Evaluation & Comparative Analysis

During high-concurrency ticket/seat registration (e.g. Flash sales), two locking approaches were evaluated:

| Metric | PostgreSQL Advisory Lock (`pg_advisory_xact_lock`) | Redis Distributed Lock / Queue |
|---|---|---|
| **ACID Guarantees** | Strict serializability inside DB transaction. Zero drift. | Eventual consistency; requires reconciliation on failure. |
| **Connection Overhead** | Holds open a DB pool connection for duration of lock. | Zero DB connection during queue wait. Releases DB load. |
| **Throughput (ops/sec)** | ~1,000 - 3,000 req/sec (limited by Postgres connection pool). | ~50,000 - 100,000 req/sec (in-memory atomic Lua counter). |
| **Failure Modes** | Connection pool exhaustion under heavy queueing. | Stale lock keys if worker crashes (mitigated by TTL). |

### Current Implementation & Recommendation
1. **Primary Strategy (PostgreSQL Advisory Lock):**
   - The application uses `SELECT pg_advisory_xact_lock(hashtext('event_applicants_' || $1::text))` within transaction boundaries.
   - For standard capacity events ($\le 1,000$ concurrent applicants), this provides absolute zero-drift capacity enforcement without distributed coordination overhead.
2. **High-Load Flash Sale Recommendation:**
   - For high-volume ticketing events (> 5,000 concurrent attempts/second), an atomic Redis decrement pre-check (`DECR event:seats:<id>`) should be placed in front of the DB transaction. Only applicants who successfully decrement the Redis counter are granted a database transaction slot, completely shielding PostgreSQL from connection pool exhaustion.

---

## 6. Frontend Generic Pattern & Standard Process Line

To eliminate redundant code and ensure standard behavior across all entities:

1. **Unified Page Header (`<PageHeader />`):**
   - Standardized title, description, status badge, and action buttons across all entity pages.
2. **Unified Data Table (`<InfiniteDataTable />`):**
   - Virtualized infinite scroll, debounced search (`<DebouncedInput />`), sorting, and empty state rendering.
3. **Unified Confirmation Actions (`<ConfirmButton />`):**
   - Standardized double-click or modal confirmation for destructive actions (e.g. Delete, Suspend).
4. **Standard React Query Factory:**
   - Centralized query keys in `queryKeys` (`tests/web/query-keys.test.ts`) guaranteeing proper cache invalidation on mutations without duplicate network requests.
