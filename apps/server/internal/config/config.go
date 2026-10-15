// Package config loads and validates process configuration from the
// environment. It fails fast at startup rather than surfacing a missing
// setting deep inside a request handler.
package config

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
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
	LandingURL  string // marketing site origin, allowed by CORS on the client API

	// ContactEmail receives the landing page's contact form. Empty: messages
	// are stored but not emailed.
	ContactEmail string

	// Auth
	JWTAccessSecret    string
	JWTRefreshSecret   string
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	GoogleClientID     string
	GoogleClientSecret string
	// GoogleRedirectURL is the client login callback registered on the
	// Google OAuth client (GOOGLE_REDIRECT_URL).
	GoogleRedirectURL string
	GoogleUserInfoURL string

	// Abuse limits.
	RateLimitPerMinute    int           // sustained requests per IP
	RateLimitBurst        int           // bucket size per IP
	AdminLoginMaxAttempts int           // failed admin logins per IP per window
	AdminLoginWindow      time.Duration //
	ContactMaxPerHour     int           // contact form messages per IP
	UploadMaxPerHour      int           // public image uploads per IP
	UploadPendingTTL      time.Duration // unclaimed uploads are deleted after this
	DevicePINTTL          time.Duration // scanner pairing PIN lifetime

	// Platform admin (admin API only). Single account from the environment;
	// checked by RequireAdmin at admin startup, not here, so the client API
	// runs without them.
	AdminUsername         string
	AdminPassword         string
	AdminJWTAccessSecret  string
	AdminJWTRefreshSecret string

	// Razorpay (payments). Empty keys disable purchases.
	RazorpayKeyID         string
	RazorpayKeySecret     string
	RazorpayWebhookSecret string
	RazorpayBaseURL       string // REST API base, e.g. https://api.razorpay.com/v1

	// ID cards: HMAC key for QR payloads. Changing it invalidates every
	// issued card.
	QRSigningSecret string

	// Email (Resend). Empty key: emails fail with "not configured".
	ResendAPIKey  string
	ResendBaseURL string
	EmailFrom     string
	// EmailSendInterval paces the email queue (Resend allows 2 requests/s).
	EmailSendInterval time.Duration

	// Event sites (cmd/sites). URL template has a {slug} placeholder.
	SitesPort        string
	SitesDomain      string
	SitesURLTemplate string

	// S3-compatible object storage (MinIO, R2, S3).
	S3Endpoint  string
	S3UseSSL    bool
	S3Region    string
	S3Bucket    string
	S3AccessKey string
	S3SecretKey string

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
		LandingURL:  getOr("LANDING_URL", "http://localhost:3002"),

		ContactEmail: os.Getenv("CONTACT_EMAIL"),

		JWTAccessSecret:    require("JWT_ACCESS_SECRET"),
		JWTRefreshSecret:   require("JWT_REFRESH_SECRET"),
		AccessTokenTTL:     getDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL:    getDuration("REFRESH_TOKEN_TTL", 7*24*time.Hour),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  getOr("GOOGLE_REDIRECT_URL", getOr("API_URL", "http://localhost:8000")+"/api/v1/auth/google/callback"),
		GoogleUserInfoURL:  getOr("GOOGLE_USERINFO_URL", "https://openidconnect.googleapis.com/v1/userinfo"),

		RateLimitPerMinute:    getInt("RATE_LIMIT_PER_MINUTE", 100),
		RateLimitBurst:        getInt("RATE_LIMIT_BURST", 100),
		AdminLoginMaxAttempts: getInt("ADMIN_LOGIN_MAX_ATTEMPTS", 5),
		AdminLoginWindow:      getDuration("ADMIN_LOGIN_WINDOW", 15*time.Minute),
		ContactMaxPerHour:     getInt("CONTACT_MAX_PER_HOUR", 5),
		UploadMaxPerHour:      getInt("UPLOAD_MAX_PER_HOUR", 30),
		UploadPendingTTL:      getDuration("UPLOAD_PENDING_TTL", 24*time.Hour),
		DevicePINTTL:          getDuration("DEVICE_PIN_TTL", 5*time.Minute),

		AdminUsername:         os.Getenv("ADMIN_USERNAME"),
		AdminPassword:         os.Getenv("ADMIN_PASSWORD"),
		AdminJWTAccessSecret:  os.Getenv("ADMIN_JWT_ACCESS_SECRET"),
		AdminJWTRefreshSecret: os.Getenv("ADMIN_JWT_REFRESH_SECRET"),

		RazorpayKeyID:         os.Getenv("RAZORPAY_KEY_ID"),
		RazorpayKeySecret:     os.Getenv("RAZORPAY_KEY_SECRET"),
		RazorpayWebhookSecret: os.Getenv("RAZORPAY_WEBHOOK_SECRET"),
		RazorpayBaseURL:       strings.TrimRight(getOr("RAZORPAY_BASE_URL", "https://api.razorpay.com/v1"), "/"),

		QRSigningSecret: require("QR_SIGNING_SECRET"),
		ResendAPIKey:      os.Getenv("RESEND_API_KEY"),
		ResendBaseURL:     strings.TrimRight(getOr("RESEND_BASE_URL", "https://api.resend.com"), "/"),
		EmailFrom:         getOr("EMAIL_FROM", "IdentityCard <no-reply@example.com>"),
		EmailSendInterval: getDuration("EMAIL_SEND_INTERVAL", 600*time.Millisecond),

		SitesPort:        getOr("SITES_PORT", "8002"),
		SitesDomain:      getOr("SITES_DOMAIN", "sites.localhost"),
		SitesURLTemplate: getOr("SITES_URL_TEMPLATE", "http://{slug}.sites.localhost:8002"),

		S3Endpoint:  getOr("S3_ENDPOINT", "localhost:9100"),
		S3UseSSL:    os.Getenv("S3_USE_SSL") == "true",
		S3Region:    getOr("S3_REGION", "us-east-1"),
		S3Bucket:    getOr("S3_BUCKET", "identitycard"),
		S3AccessKey: os.Getenv("S3_ACCESS_KEY"),
		S3SecretKey: os.Getenv("S3_SECRET_KEY"),

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

// RequireAdmin fails unless every admin setting is present. The admin
// binary calls it right after Load.
func (c *Config) RequireAdmin() error {
	var missing []string
	for key, v := range map[string]string{
		"ADMIN_USERNAME":           c.AdminUsername,
		"ADMIN_PASSWORD":           c.AdminPassword,
		"ADMIN_JWT_ACCESS_SECRET":  c.AdminJWTAccessSecret,
		"ADMIN_JWT_REFRESH_SECRET": c.AdminJWTRefreshSecret,
	} {
		if v == "" {
			missing = append(missing, key)
		}
	}
	if len(missing) > 0 {
		sort.Strings(missing)
		return fmt.Errorf("config: missing required admin environment variables: %s", strings.Join(missing, ", "))
	}
	if len(c.AdminPassword) < 12 {
		return fmt.Errorf("config: ADMIN_PASSWORD must be at least 12 characters")
	}
	return nil
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

// getDuration reads a Go duration ("15m", "24h", "600ms").
func getDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil || d <= 0 {
		return fallback
	}
	return d
}
