package cache

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// Cache wraps a Redis client with resilient JSON caching, scanning, and invalidation.
type Cache struct {
	client *redis.Client
}

// New initializes a new Cache instance.
func New(client *redis.Client) *Cache {
	return &Cache{client: client}
}

// Client returns the underlying Redis client.
func (c *Cache) Client() *redis.Client {
	if c == nil {
		return nil
	}
	return c.client
}

// Ping checks whether Redis is reachable.
func (c *Cache) Ping(ctx context.Context) error {
	if c == nil || c.client == nil {
		return fmt.Errorf("cache: redis client not initialized")
	}
	return c.client.Ping(ctx).Err()
}
