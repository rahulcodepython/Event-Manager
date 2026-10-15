package googleid

import (
    "context"
    "crypto/rand"
    "crypto/rsa"
    "encoding/base64"
    "encoding/json"
    "errors"
    "math/big"
    "net/http"
    "net/http/httptest"
    "testing"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

func TestVerify(t *testing.T) {
    key, _ := rsa.GenerateKey(rand.Reader, 2048)
    srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
        _ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
            "kid": "k1", "kty": "RSA",
            "n": base64.RawURLEncoding.EncodeToString(key.N.Bytes()),
            "e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.E)).Bytes()),
        }}})
    }))
    defer srv.Close()

    sign := func(c jwt.MapClaims, k *rsa.PrivateKey) string {
        tok := jwt.NewWithClaims(jwt.SigningMethodRS256, c)
        tok.Header["kid"] = "k1"
        s, _ := tok.SignedString(k)
        return s
    }
    base := func() jwt.MapClaims {
        return jwt.MapClaims{
            "iss": "https://accounts.google.com", "aud": "client-1", "sub": "123",
            "email": "a@gmail.com", "email_verified": true, "name": "A", "picture": "p",
            "exp": time.Now().Add(time.Hour).Unix(),
        }
    }
    v := New("client-1", srv.URL)

    id, err := v.Verify(context.Background(), sign(base(), key))
    if err != nil || id.Sub != "123" || id.Email != "a@gmail.com" {
        t.Fatalf("valid token: %+v %v", id, err)
    }

    other, _ := rsa.GenerateKey(rand.Reader, 2048)
    bad := map[string]string{}
    c := base(); c["aud"] = "someone-else"; bad["audience"] = sign(c, key)
    c = base(); c["iss"] = "evil"; bad["issuer"] = sign(c, key)
    c = base(); c["exp"] = time.Now().Add(-time.Hour).Unix(); bad["expired"] = sign(c, key)
    c = base(); c["email_verified"] = false; bad["unverified"] = sign(c, key)
    bad["wrong key"] = sign(base(), other)
    bad["garbage"] = "x.y.z"
    for name, tok := range bad {
        if _, err := v.Verify(context.Background(), tok); !errors.Is(err, ErrInvalid) {
            t.Errorf("%s: accepted (%v)", name, err)
        }
    }
}
