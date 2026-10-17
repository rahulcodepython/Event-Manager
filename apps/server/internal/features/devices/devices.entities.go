package devices

import (
    "encoding/json"
    "errors"
    "time"

    "github.com/go-webauthn/webauthn/webauthn"
)

var (
    ErrDeviceNotFound               = errors.New("device not found")
    ErrInvalidDeviceID             = errors.New("invalid device id")
    ErrInvalidEventID              = errors.New("invalid event id")
    ErrDeviceAlreadyPairedWithOther = errors.New("this device is already paired with another device record")
    ErrInvalidPIN                  = errors.New("invalid verification pin")
    ErrPINExpired                  = errors.New("verification pin has expired")
    ErrDeviceExpired               = errors.New("device has expired. please re-verify it")
    ErrDeviceAlreadyAssigned       = errors.New("device is already assigned to this event")
    ErrRateLimitExceeded           = errors.New("too many requests. please wait a minute before retrying")
    ErrTooManyWrongGuesses         = errors.New("too many failed attempts. a new pin has been generated")
    ErrEmptyDeviceName             = errors.New("device name cannot be empty")
    ErrWebAuthnNotEnrolled         = errors.New("device is not enrolled for biometric authentication")
    ErrWebAuthnSessionExpired      = errors.New("biometric session expired. please try again")
    ErrWebAuthnVerificationFailed  = errors.New("biometric verification failed")
)

type Device struct {
    ID                   string     `json:"id"`
    Name                 string     `json:"name"`
    ActualName           *string    `json:"actual_name,omitempty"`
    Fingerprint          *string    `json:"fingerprint,omitempty"`
    PIN                  *string    `json:"pin,omitempty"`
    PINExpiresAt         *time.Time `json:"pin_expires_at,omitempty"`
    ExpiresAt            *time.Time `json:"expires_at,omitempty"`
    LastActiveAt         *time.Time `json:"last_active_at,omitempty"`
    WebAuthnCredentialID *string    `json:"webauthn_credential_id,omitempty"`
    WebAuthnPublicKey    *string    `json:"webauthn_public_key,omitempty"`
    WebAuthnAAGUID       *string    `json:"webauthn_aaguid,omitempty"`
    WebAuthnSignCount    int64      `json:"webauthn_sign_count"`
    CredentialJSON       *string    `json:"-"`
    IsBiometricEnrolled  bool       `json:"is_biometric_enrolled"`
    IsPaired             bool       `json:"is_paired"`
    IsExpired            bool       `json:"is_expired"`
    CreatedAt            time.Time  `json:"created_at"`
    UpdatedAt            time.Time  `json:"updated_at"`
}

func (d *Device) WebAuthnID() []byte {
    return []byte(d.ID)
}

func (d *Device) WebAuthnName() string {
    if d.ActualName != nil && *d.ActualName != "" {
        return *d.ActualName
    }
    return d.Name
}

func (d *Device) WebAuthnDisplayName() string {
    return d.Name
}

func (d *Device) WebAuthnCredentials() []webauthn.Credential {
    if d.CredentialJSON != nil && len(*d.CredentialJSON) > 0 {
        var cred webauthn.Credential
        if err := json.Unmarshal([]byte(*d.CredentialJSON), &cred); err == nil {
            return []webauthn.Credential{cred}
        }
    }
    return []webauthn.Credential{}
}

type EventDeviceAssignment struct {
    ID        string    `json:"id"`
    EventID   string    `json:"event_id"`
    DeviceID  string    `json:"device_id"`
    Device    Device    `json:"device"`
    CreatedAt time.Time `json:"created_at"`
}

type CreateDeviceRequest struct {
    Name      string     `json:"name"`
    ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

type UpdateDeviceRequest struct {
    Name      *string    `json:"name,omitempty"`
    ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

type VerifyDeviceRequest struct {
    PIN         string `json:"pin"`
    Fingerprint string `json:"fingerprint"`
    ActualName  string `json:"actual_name"`
}

type VerifyDeviceResponse struct {
    DeviceID            string     `json:"device_id"`
    Name                string     `json:"name"`
    ActualName          string     `json:"actual_name"`
    Token               string     `json:"token"`
    IsBiometricEnrolled bool       `json:"is_biometric_enrolled"`
    ExpiresAt           *time.Time `json:"expires_at,omitempty"`
}

type AssignEventDevicesRequest struct {
    DeviceIDs []string `json:"device_ids"`
}

type WebAuthnRegisterOptionsRequest struct {
    PIN        string `json:"pin"`
    ActualName string `json:"actual_name"`
}

type WebAuthnRegisterOptionsResponse struct {
    SessionID string      `json:"session_id"`
    Options   interface{} `json:"options"`
}

type WebAuthnRegisterVerifyRequest struct {
    SessionID   string          `json:"session_id"`
    ActualName  string          `json:"actual_name"`
    Fingerprint string          `json:"fingerprint"`
    Response    json.RawMessage `json:"response"`
}

type WebAuthnLoginOptionsRequest struct {
    DeviceID     string `json:"device_id,omitempty"`
    CredentialID string `json:"credential_id,omitempty"`
}

type WebAuthnLoginOptionsResponse struct {
    SessionID string      `json:"session_id"`
    Options   interface{} `json:"options"`
}

type WebAuthnLoginVerifyRequest struct {
    SessionID string          `json:"session_id"`
    Response  json.RawMessage `json:"response"`
}
