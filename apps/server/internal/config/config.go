// Package config loads and validates process configuration from the
// environment. It fails fast at startup rather than surfacing a missing
// setting deep inside a request handler.
package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Env string // "development" | "production"

	// Ports and public URLs
	APIPort     string
	AdminPort   string
	APIURL      string // public base URL of the client API, e.g. http://localhost:8000
	WebURL      string // client web app origin, allowed by CORS
	AdminWebURL string // admin web app origin, allowed by CORS on the admin API

	// Auth
	JWTAccessSecret    string
	JWTRefreshSecret   string
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	GoogleClientID     string
	GoogleClientSecret string

	// WebAuthn Relying Party configuration
	RPDisplayName   string
	RPID            string
	CanonicalOrigin string

	// Postgres
	DatabaseURL           string
	DBMaxOpenConns        int
	DBMaxIdleConns        int
	DBConnMaxLifetimeMin  int
	DBConnMaxIdleTimeMin  int
	DBStatementTimeoutSec int

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int

	RequestTimeoutSec int
	TrustedProxies    []string

	SeedClientEmail string
}

// IsProduction reports whether the app runs with production settings
// (e.g. Secure cookies).
func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

// Load reads configuration from the environment, loading the repo-root .env
// first if one is found, and returns an error naming every missing required
// variable at once instead of failing one at a time.
func Load() (*Config, error) {
	if path := findEnvFile(); path != "" {
		_ = godotenv.Load(path)
	}

	var missing []string
	require := func(key string) string {
		v := os.Getenv(key)
		if v == "" {
			missing = append(missing, key)
		}
		return v
	}

	webURL := getOr("WEB_URL", "http://localhost:3000")

	cfg := &Config{
		Env:         getOr("APP_ENV", "development"),
		APIPort:     getOr("API_PORT", "8000"),
		AdminPort:   getOr("ADMIN_API_PORT", "8001"),
		APIURL:      getOr("API_URL", "http://localhost:8000"),
		WebURL:      webURL,
		AdminWebURL: getOr("ADMIN_WEB_URL", "http://localhost:3001"),

		JWTAccessSecret:    require("JWT_ACCESS_SECRET"),
		JWTRefreshSecret:   require("JWT_REFRESH_SECRET"),
		AccessTokenTTL:     15 * time.Minute,
		RefreshTokenTTL:    7 * 24 * time.Hour,
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),

		RPDisplayName:   getOr("WEBAUTHN_RP_DISPLAY_NAME", "IdentityCard Scanner"),
		RPID:            getOr("WEBAUTHN_RP_ID", "localhost"),
		CanonicalOrigin: webURL,

		DatabaseURL:           require("DATABASE_URL"),
		DBMaxOpenConns:        getInt("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns:        getInt("DB_MAX_IDLE_CONNS", 10),
		DBConnMaxLifetimeMin:  getInt("DB_CONN_MAX_LIFETIME_MIN", 60),
		DBConnMaxIdleTimeMin:  getInt("DB_CONN_MAX_IDLE_TIME_MIN", 30),
		DBStatementTimeoutSec: getInt("DB_STATEMENT_TIMEOUT_SEC", 15),

		RedisHost:     getOr("REDIS_HOST", "localhost"),
		RedisPort:     getOr("REDIS_PORT", "6379"),
		RedisPassword: require("REDIS_PASSWORD"),
		RedisDB:       getInt("REDIS_DB", 0),

		RequestTimeoutSec: getInt("REQUEST_TIMEOUT_SEC", 30),
		SeedClientEmail:   os.Getenv("SEED_CLIENT_EMAIL"),
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

// findEnvFile walks up from the working directory to the first .env file,
// so every binary reads the single repo-root .env wherever it is started.
func findEnvFile() string {
	dir, err := os.Getwd()
	if err != nil {
		return ""
	}
	for {
		path := filepath.Join(dir, ".env")
		if _, err := os.Stat(path); err == nil {
			return path
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return ""
		}
		dir = parent
	}
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
