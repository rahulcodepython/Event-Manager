// Package config loads and validates process configuration from the
// environment. It fails fast at startup rather than surfacing a missing
// setting deep inside a request handler.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Env         string // "development" | "production"
	Port        string
	DatabaseURL string
	WebOrigin   string // the Next.js origin allowed by CORS, e.g. http://localhost:3000

	// Admin API (cmd/admin): separate binary on its own port
	AdminPort      string
	AdminWebOrigin string // the admin web UI origin allowed by CORS

	// WebAuthn Relying Party configuration
	RPDisplayName   string // WebAuthn Relying Party Display Name
	RPID            string // WebAuthn Relying Party ID (domain/host)
	CanonicalOrigin string // WebAuthn canonical origin URL (e.g. http://localhost:3000)

	// Redis and Cache configurations
	RedisURL      string
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int

	// Database connection pooling & timeouts
	DBMaxOpenConns        int
	DBMaxIdleConns        int
	DBConnMaxLifetimeMin  int
	DBConnMaxIdleTimeMin  int
	DBStatementTimeoutSec int
	RequestTimeoutSec     int
	TrustedProxies        []string
}

// Load reads configuration from the environment (loading a local .env file
// first, if present) and returns an error naming every missing required
// variable at once instead of failing one at a time.
func Load() (*Config, error) {
	_ = godotenv.Load()

	var missing []string
	require := func(key string) string {
		v := os.Getenv(key)
		if v == "" {
			missing = append(missing, key)
		}
		return v
	}

	cfg := &Config{
		Env:                   getOr("APP_ENV", "development"),
		Port:                  getOr("PORT", "8000"),
		DatabaseURL:           require("DATABASE_URL"),
		WebOrigin:             getOr("WEB_ORIGIN", "http://localhost:3000"),
		AdminPort:             getOr("ADMIN_PORT", "8001"),
		AdminWebOrigin:        getOr("ADMIN_WEB_ORIGIN", "http://localhost:3001"),
		RPDisplayName:         getOr("WEBAUTHN_RP_DISPLAY_NAME", "IdentityCard Scanner"),
		RPID:                  getOr("WEBAUTHN_RP_ID", "localhost"),
		CanonicalOrigin:       getOr("WEB_ORIGIN", "http://localhost:3000"),
		RedisURL:              getOr("REDIS_URL", "redis://localhost:6379"),
		RedisHost:             getOr("REDIS_HOST", "localhost"),
		RedisPort:             getOr("REDIS_PORT", "6379"),
		RedisPassword:         getOr("REDIS_PASSWORD", ""),
		RedisDB:               getInt("REDIS_DB", 0),
		DBMaxOpenConns:        getInt("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns:        getInt("DB_MAX_IDLE_CONNS", 10),
		DBConnMaxLifetimeMin:  getInt("DB_CONN_MAX_LIFETIME_MIN", 60),
		DBConnMaxIdleTimeMin:  getInt("DB_CONN_MAX_IDLE_TIME_MIN", 30),
		DBStatementTimeoutSec: getInt("DB_STATEMENT_TIMEOUT_SEC", 15),
		RequestTimeoutSec:     getInt("REQUEST_TIMEOUT_SEC", 30),
	}

	defaultProxies := []string{
		"127.0.0.1/8",
		"::1/128",
		"10.0.0.0/8",     // Kubernetes pod network, AWS VPC, Docker Swarm
		"172.16.0.0/12",  // Docker standard bridge networks (172.16.0.0 - 172.31.255.255)
		"192.168.0.0/16", // Local LAN and custom container bridge networks
		"fc00::/7",       // IPv6 Unique Local Addresses
	}
	if envProxies := os.Getenv("TRUSTED_PROXIES"); envProxies != "" {
		for _, p := range strings.Split(envProxies, ",") {
			trimmed := strings.TrimSpace(p)
			if trimmed != "" {
				defaultProxies = append(defaultProxies, trimmed)
			}
		}
	}
	cfg.TrustedProxies = defaultProxies

	if len(missing) > 0 {
		return nil, fmt.Errorf("config: missing required environment variables: %s", strings.Join(missing, ", "))
	}
	return cfg, nil
}

func getOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
