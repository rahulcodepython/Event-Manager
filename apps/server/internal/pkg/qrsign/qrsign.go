// Package qrsign signs and verifies the payload printed in an applicant's
// QR code, so a card cannot be forged or edited.
//
// Format: "IC1.<base64url(json payload)>.<base64url(HMAC-SHA256)>". The
// payload is readable (scanners use the event id to pick the endpoint); only
// the server can produce a valid signature.
package qrsign

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/base64"
    "encoding/json"
    "errors"
    "strings"
)

const prefix = "IC1"

var ErrInvalid = errors.New("invalid or forged QR code")

type Payload struct {
    EventID     string `json:"e"`
    ApplicantID string `json:"a"`
}

type Signer struct {
    key []byte
}

func New(secret string) *Signer {
    return &Signer{key: []byte(secret)}
}

func (s *Signer) mac(data string) []byte {
    h := hmac.New(sha256.New, s.key)
    h.Write([]byte(data))
    return h.Sum(nil)
}

// Sign returns the QR text for an applicant of an event.
func (s *Signer) Sign(eventID, applicantID string) string {
    raw, _ := json.Marshal(Payload{EventID: eventID, ApplicantID: applicantID})
    body := prefix + "." + base64.RawURLEncoding.EncodeToString(raw)
    return body + "." + base64.RawURLEncoding.EncodeToString(s.mac(body))
}

// Verify checks the signature and returns the payload.
func (s *Signer) Verify(token string) (Payload, error) {
    parts := strings.Split(strings.TrimSpace(token), ".")
    if len(parts) != 3 || parts[0] != prefix {
        return Payload{}, ErrInvalid
    }
    sig, err := base64.RawURLEncoding.DecodeString(parts[2])
    if err != nil || !hmac.Equal(sig, s.mac(parts[0]+"."+parts[1])) {
        return Payload{}, ErrInvalid
    }
    raw, err := base64.RawURLEncoding.DecodeString(parts[1])
    if err != nil {
        return Payload{}, ErrInvalid
    }
    var p Payload
    if err := json.Unmarshal(raw, &p); err != nil || p.EventID == "" || p.ApplicantID == "" {
        return Payload{}, ErrInvalid
    }
    return p, nil
}
