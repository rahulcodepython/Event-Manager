package middlewares

import (
    "fmt"
    "log/slog"
    "math"
    "strconv"
    "strings"

    "github.com/gofiber/fiber/v2"
    "github.com/redis/go-redis/v9"

    "identitycard-server/internal/generic"
    "identitycard-server/internal/utils"
)

// Each client IP gets a bucket of burst tokens that refills at perMinute
// tokens a minute (RATE_LIMIT_BURST, RATE_LIMIT_PER_MINUTE). A request
// spends one token; an empty bucket means 429.
const redisKeyRateBucket = "rate:bucket:%s"

// tokenBucketScript refills and spends atomically inside Redis, using Redis'
// own clock so every API instance shares one bucket per IP.
// KEYS[1] bucket key; ARGV[1] capacity; ARGV[2] refill per second.
// Returns {allowed (1|0), tokens left (floored), seconds until next token}.
var tokenBucketScript = redis.NewScript(`
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

local wait = 0
if allowed == 0 then
    wait = (1 - tokens) / rate
end

return {allowed, math.floor(tokens), tostring(wait)}
`)

// RateLimiterMiddleware applies a Redis token bucket per client IP. Health
// checks are exempt. If Redis is unreachable the request is allowed, so the
// API keeps working (Redis is a soft dependency).
func RateLimiterMiddleware(rdb *redis.Client, perMinute, burst int) fiber.Handler {
    bucketCapacity := max(burst, 1)
    refillPerSecond := float64(max(perMinute, 1)) / 60.0
    return func(c *fiber.Ctx) error {
        if path := c.Path(); path == generic.RouteHealth || strings.HasSuffix(path, generic.RouteHealth) {
            return c.Next()
        }

        key := fmt.Sprintf(redisKeyRateBucket, c.IP())
        res, err := tokenBucketScript.Run(c.UserContext(), rdb, []string{key}, bucketCapacity, refillPerSecond).Slice()
        if err != nil || len(res) != 3 {
            slog.Warn("rate limiter unavailable, allowing request", "error", err)
            return c.Next()
        }

        allowed, _ := res[0].(int64)
        remaining, _ := res[1].(int64)
        c.Set("X-RateLimit-Limit", strconv.Itoa(bucketCapacity))
        c.Set("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))

        if allowed != 1 {
            wait, _ := strconv.ParseFloat(res[2].(string), 64)
            c.Set(fiber.HeaderRetryAfter, strconv.Itoa(int(math.Ceil(wait))))
            return utils.ErrTooManyRequests(c, generic.ErrMsgTooManyRequests, nil)
        }
        return c.Next()
    }
}
