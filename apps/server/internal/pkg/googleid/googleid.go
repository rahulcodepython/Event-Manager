// Package googleid verifies Google Sign-In ID tokens (Google Identity
// Services): RS256 signature against Google's published keys, issuer,
// audience (our OAuth client id), expiry and a verified email.
package googleid

import (
    "context"
    "crypto/rsa"
    "encoding/base64"
    "encoding/json"
    "errors"
    "fmt"
    "math/big"
    "net/http"
    "sync"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

var ErrInvalid = errors.New("invalid Google sign-in")

// Identity is what a valid token says about the person.
type Identity struct {
    Sub     string
    Email   string
    Name    string
    Picture string
    // Nonce echoes the nonce our page passed to Google; the caller checks it.
    Nonce string
}

type claims struct {
    Email         string `json:"email"`
    EmailVerified bool   `json:"email_verified"`
    Name          string `json:"name"`
    Picture       string `json:"picture"`
    Nonce         string `json:"nonce"`
    jwt.RegisteredClaims
}

type Verifier struct {
    clientID string
    certsURL string
    http     *http.Client

    mu      sync.RWMutex
    keys    map[string]*rsa.PublicKey
    fetched time.Time
}

func New(clientID, certsURL string) *Verifier {
    return &Verifier{clientID: clientID, certsURL: certsURL, http: &http.Client{Timeout: 10 * time.Second}}
}

// Verify checks a token and returns the identity it carries.
func (v *Verifier) Verify(ctx context.Context, token string) (*Identity, error) {
    if v.clientID == "" {
        return nil, fmt.Errorf("%w: Google sign-in is not configured", ErrInvalid)
    }
    var c claims
    _, err := jwt.ParseWithClaims(token, &c, func(t *jwt.Token) (any, error) {
        kid, _ := t.Header["kid"].(string)
        return v.key(ctx, kid)
    },
        jwt.WithValidMethods([]string{"RS256"}),
        jwt.WithAudience(v.clientID),
        jwt.WithExpirationRequired(),
        jwt.WithLeeway(30*time.Second),
    )
    if err != nil {
        return nil, fmt.Errorf("%w: %v", ErrInvalid, err)
    }
    if c.Issuer != "accounts.google.com" && c.Issuer != "https://accounts.google.com" {
        return nil, fmt.Errorf("%w: wrong issuer", ErrInvalid)
    }
    if c.Subject == "" || c.Email == "" || !c.EmailVerified {
        return nil, fmt.Errorf("%w: the Google account's email is not verified", ErrInvalid)
    }
    return &Identity{Sub: c.Subject, Email: c.Email, Name: c.Name, Picture: c.Picture, Nonce: c.Nonce}, nil
}

// key returns Google's key by id, refreshing the cached set when the id is
// unknown (keys rotate) or the set is older than an hour.
func (v *Verifier) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
    v.mu.RLock()
    k, ok := v.keys[kid]
    fresh := time.Since(v.fetched) < time.Hour
    v.mu.RUnlock()
    if ok && fresh {
        return k, nil
    }
    if err := v.refresh(ctx); err != nil {
        return nil, err
    }
    v.mu.RLock()
    defer v.mu.RUnlock()
    if k, ok := v.keys[kid]; ok {
        return k, nil
    }
    return nil, errors.New("unknown signing key")
}

type jwks struct {
    Keys []struct {
        Kid string `json:"kid"`
        Kty string `json:"kty"`
        N   string `json:"n"`
        E   string `json:"e"`
    } `json:"keys"`
}

func (v *Verifier) refresh(ctx context.Context) error {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.certsURL, nil)
    if err != nil {
        return err
    }
    resp, err := v.http.Do(req)
    if err != nil {
        return fmt.Errorf("google certs: %w", err)
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("google certs: status %d", resp.StatusCode)
    }
    var set jwks
    if err := json.NewDecoder(resp.Body).Decode(&set); err != nil {
        return fmt.Errorf("google certs: %w", err)
    }
    keys := map[string]*rsa.PublicKey{}
    for _, k := range set.Keys {
        if k.Kty != "RSA" {
            continue
        }
        n, err1 := base64.RawURLEncoding.DecodeString(k.N)
        e, err2 := base64.RawURLEncoding.DecodeString(k.E)
        if err1 != nil || err2 != nil {
            continue
        }
        keys[k.Kid] = &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}
    }
    v.mu.Lock()
    v.keys, v.fetched = keys, time.Now()
    v.mu.Unlock()
    return nil
}
