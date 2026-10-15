package redis

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"

	"identitycard-server/internal/config"
	"identitycard-server/internal/pkg/retry"
)

// Connect returns a configured Redis client.
// Redis is treated as a resilient soft dependency — if it fails to connect,
// a warning is logged and the client is still returned so caching degrades gracefully.
func Connect(ctx context.Context, cfg *config.Config) *redis.Client {
	opts := &redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	}

	client := redis.NewClient(opts)

	const maxAttempts = 3
	err := retry.Connect("redis", maxAttempts, 1*time.Second, func() error {
		pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		return client.Ping(pingCtx).Err()
	})

	if err != nil {
		slog.Warn("failed to connect to redis, caching will fallback gracefully",
			"addr", opts.Addr,
			"attempts", maxAttempts,
			"error", err,
		)
	} else {
		slog.Info("connected to redis", "addr", opts.Addr)
	}

	return client
}
