package cache

import (
    "context"
    "crypto/rand"
    "encoding/binary"
    "encoding/json"
    "log/slog"
    "math"
    "time"

    "github.com/redis/go-redis/v9"
)

// DefaultJitterPercentage defines the standard TTL dispersion (+-20%) to avoid cache thundering herds.
const DefaultJitterPercentage = 0.20

// AddJitter applies a pseudo-random variance within +-jitterPct to baseTTL.
// For example, baseTTL=10m with jitterPct=0.20 produces a duration between 8m and 12m.
func AddJitter(baseTTL time.Duration, jitterPct float64) time.Duration {
    if baseTTL <= 0 {
        return baseTTL
    }
    if jitterPct <= 0 || jitterPct >= 1.0 {
        jitterPct = DefaultJitterPercentage
    }

    var buf [8]byte
    _, err := rand.Read(buf[:])
    var factor float64
    if err != nil {
        factor = 0.5
    } else {
        randUint := binary.LittleEndian.Uint64(buf[:])
        factor = float64(randUint) / float64(math.MaxUint64) // [0.0, 1.0)
    }

    // Map [0.0, 1.0) to [-jitterPct, +jitterPct]
    variance := (factor*2.0 - 1.0) * jitterPct
    multiplier := 1.0 + variance
    result := time.Duration(float64(baseTTL) * multiplier)
    if result <= 0 {
        return baseTTL
    }
    return result
}

// Get fetches JSON data for key and unmarshals it into dest.
// Returns (true, nil) on a cache hit, (false, nil) on a cache miss or if Redis is unavailable.
func (c *Cache) Get(ctx context.Context, key string, dest any) (bool, error) {
    if c == nil || c.client == nil {
        return false, nil
    }

    val, err := c.client.Get(ctx, key).Result()
    if err == redis.Nil {
        return false, nil
    }
    if err != nil {
        slog.Error("cache: get error", "key", key, "error", err)
        return false, nil
    }

    if err := json.Unmarshal([]byte(val), dest); err != nil {
        slog.Error("cache: unmarshal error", "key", key, "error", err)
        return false, nil
    }

    return true, nil
}

// Set serializes val to JSON and stores it in Redis with the given TTL.
func (c *Cache) Set(ctx context.Context, key string, val any, ttl time.Duration) error {
    if c == nil || c.client == nil {
        return nil
    }

    data, err := json.Marshal(val)
    if err != nil {
        slog.Error("cache: marshal error", "key", key, "error", err)
        return err
    }

    if err := c.client.Set(ctx, key, data, ttl).Err(); err != nil {
        slog.Error("cache: set error", "key", key, "error", err)
        return nil
    }

    return nil
}

// SetWithJitter stores a key in Redis with a TTL randomized within +-jitterPct.
func (c *Cache) SetWithJitter(ctx context.Context, key string, val any, baseTTL time.Duration, jitterPct float64) error {
    return c.Set(ctx, key, val, AddJitter(baseTTL, jitterPct))
}

// Delete removes one or more keys from Redis.
func (c *Cache) Delete(ctx context.Context, keys ...string) error {
    if c == nil || c.client == nil || len(keys) == 0 {
        return nil
    }

    if err := c.client.Del(ctx, keys...).Err(); err != nil {
        slog.Error("cache: delete error", "error", err)
        return err
    }

    return nil
}

// DeletePattern scans and removes all keys matching the provided pattern non-blockingly.
func (c *Cache) DeletePattern(ctx context.Context, pattern string) error {
    if c == nil || c.client == nil || pattern == "" {
        return nil
    }

    var cursor uint64
    for {
        keys, nextCursor, err := c.client.Scan(ctx, cursor, pattern, 100).Result()
        if err != nil {
            slog.Error("cache: scan pattern error", "pattern", pattern, "error", err)
            return err
        }
        if len(keys) > 0 {
            if err := c.client.Del(ctx, keys...).Err(); err != nil {
                slog.Error("cache: del pattern batch error", "error", err)
            }
        }
        cursor = nextCursor
        if cursor == 0 {
            break
        }
    }
    return nil
}

// Remember implements the standard cache-aside pattern:
// 1. Returns cached value if present.
// 2. Otherwise calls fetch(), stores result in cache for ttl, and returns it.
func Remember[T any](ctx context.Context, c *Cache, key string, ttl time.Duration, fetch func() (T, error)) (T, error) {
    if c != nil && c.client != nil {
        var cached T
        hit, err := c.Get(ctx, key, &cached)
        if err == nil && hit {
            return cached, nil
        }
    }

    data, err := fetch()
    if err != nil {
        var zero T
        return zero, err
    }

    if c != nil && c.client != nil {
        _ = c.Set(ctx, key, data, ttl)
    }

    return data, nil
}

// RememberWithJitter implements cache-aside with anti-stampede TTL variance (+-20% default).
func RememberWithJitter[T any](ctx context.Context, c *Cache, key string, baseTTL time.Duration, jitterPct float64, fetch func() (T, error)) (T, error) {
    jitteredTTL := AddJitter(baseTTL, jitterPct)
    return Remember(ctx, c, key, jitteredTTL, fetch)
}
