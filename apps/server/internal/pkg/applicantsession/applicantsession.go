// Package applicantsession is the short-lived sign-in of an applicant on
// one public form: a signed HttpOnly cookie holding the form and the
// Google identity. It is not an account; signing in on another form
// replaces it.
package applicantsession

import (
    "errors"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
)

const (
    CookieName = "applicant_session"
    // Path limits the cookie to the public apply API.
    CookiePath = "/api/v1/public/apply"
    audience   = "applicant"
)

var ErrNoSession = errors.New("sign in with Google to continue")

type Session struct {
    FormID  string
    Sub     string
    Email   string
    Name    string
    Picture string
}

type claims struct {
    Form    string `json:"frm"`
    Email   string `json:"email"`
    Name    string `json:"name"`
    Picture string `json:"pic"`
    jwt.RegisteredClaims
}

type Manager struct {
    secret []byte
    ttl    time.Duration
    // intentTTL: how long a started sign-in stays valid.
    intentTTL time.Duration
    secure    bool
}

func New(secret string, ttl, intentTTL time.Duration, secure bool) *Manager {
    return &Manager{secret: []byte(secret), ttl: ttl, intentTTL: intentTTL, secure: secure}
}

// Set signs the session into the cookie.
func (m *Manager) Set(c *fiber.Ctx, s Session) error {
    now := time.Now()
    token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{
        Form: s.FormID, Email: s.Email, Name: s.Name, Picture: s.Picture,
        RegisteredClaims: jwt.RegisteredClaims{
            Subject:   s.Sub,
            Audience:  jwt.ClaimStrings{audience},
            IssuedAt:  jwt.NewNumericDate(now),
            ExpiresAt: jwt.NewNumericDate(now.Add(m.ttl)),
        },
    }).SignedString(m.secret)
    if err != nil {
        return err
    }
    c.Cookie(&fiber.Cookie{
        Name: CookieName, Value: token, Path: CookiePath,
        MaxAge: int(m.ttl.Seconds()), HTTPOnly: true, Secure: m.secure, SameSite: fiber.CookieSameSiteLaxMode,
    })
    return nil
}

// Get returns the session for this form, or ErrNoSession.
func (m *Manager) Get(c *fiber.Ctx, formID string) (*Session, error) {
    raw := c.Cookies(CookieName)
    if raw == "" {
        return nil, ErrNoSession
    }
    var cl claims
    _, err := jwt.ParseWithClaims(raw, &cl, func(*jwt.Token) (any, error) { return m.secret, nil },
        jwt.WithValidMethods([]string{"HS256"}), jwt.WithAudience(audience), jwt.WithExpirationRequired())
    if err != nil || cl.Form != formID || cl.Subject == "" {
        return nil, ErrNoSession
    }
    return &Session{FormID: cl.Form, Sub: cl.Subject, Email: cl.Email, Name: cl.Name, Picture: cl.Picture}, nil
}

func (m *Manager) Clear(c *fiber.Ctx) {
    c.Cookie(&fiber.Cookie{
        Name: CookieName, Value: "", Path: CookiePath, MaxAge: -1, Expires: time.Unix(0, 0),
        HTTPOnly: true, Secure: m.secure, SameSite: fiber.CookieSameSiteLaxMode,
    })
}

// IntentCookie carries the sign-in nonce between our page and Google: the
// page asks for a nonce, passes it to Google, and the returned ID token
// must carry it. This stops a third party from signing someone into the
// third party's Google identity (login CSRF), also in redirect mode where
// Google posts straight to the API.
const IntentCookie = "applicant_intent"

type intentClaims struct {
    Form  string `json:"frm"`
    Nonce string `json:"nonce"`
    jwt.RegisteredClaims
}

// NewIntent stores a fresh nonce for formID and returns it.
func (m *Manager) NewIntent(c *fiber.Ctx, formID string) (string, error) {
    nonce := uuid.NewString()
    token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, intentClaims{
        Form: formID, Nonce: nonce,
        RegisteredClaims: jwt.RegisteredClaims{
            Audience:  jwt.ClaimStrings{audience + ":intent"},
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.intentTTL)),
        },
    }).SignedString(m.secret)
    if err != nil {
        return "", err
    }
    c.Cookie(&fiber.Cookie{
        Name: IntentCookie, Value: token, Path: CookiePath,
        MaxAge: int(m.intentTTL.Seconds()), HTTPOnly: true, Secure: m.secure, SameSite: fiber.CookieSameSiteLaxMode,
    })
    return nonce, nil
}

// Intent returns the form and nonce of the pending sign-in, and clears it
// (single use).
func (m *Manager) Intent(c *fiber.Ctx) (formID, nonce string, err error) {
    raw := c.Cookies(IntentCookie)
    c.Cookie(&fiber.Cookie{Name: IntentCookie, Value: "", Path: CookiePath, MaxAge: -1, Expires: time.Unix(0, 0), HTTPOnly: true, Secure: m.secure, SameSite: fiber.CookieSameSiteLaxMode})
    if raw == "" {
        return "", "", ErrNoSession
    }
    var cl intentClaims
    _, err = jwt.ParseWithClaims(raw, &cl, func(*jwt.Token) (any, error) { return m.secret, nil },
        jwt.WithValidMethods([]string{"HS256"}), jwt.WithAudience(audience+":intent"), jwt.WithExpirationRequired())
    if err != nil || cl.Nonce == "" {
        return "", "", ErrNoSession
    }
    return cl.Form, cl.Nonce, nil
}
