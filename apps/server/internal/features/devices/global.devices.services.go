package devices

import (
    "bytes"
    "context"
    "encoding/base64"
    "encoding/hex"
    "encoding/json"
    "errors"
    "fmt"
    "strings"
    "time"

    "github.com/go-webauthn/webauthn/protocol"
    "github.com/go-webauthn/webauthn/webauthn"
    "github.com/google/uuid"
    "identitycard-server/internal/generic"
    "identitycard-server/internal/pkg/postgres"
)

type StoredWebAuthnSession struct {
    DeviceID    string               `json:"device_id"`
    ActualName  string               `json:"actual_name"`
    RPID        string               `json:"rpid"`
    Origin      string               `json:"origin"`
    SessionData webauthn.SessionData `json:"session_data"`
}

func (s *App) CreateDeviceService(ctx context.Context, orgID string, req CreateDeviceRequest) (*Device, error) {
    name := strings.TrimSpace(req.Name)
    if name == "" {
        return nil, ErrEmptyDeviceName
    }

    pin, err := generatePIN()
    if err != nil {
        return nil, fmt.Errorf("failed to generate pin: %w", err)
    }

    pinExpiresAt := time.Now().Add(5 * time.Minute)
    return s.CreateDeviceRepository(ctx, orgID, name, pin, pinExpiresAt, req.ExpiresAt)
}

func (s *App) ListDevicesService(ctx context.Context, orgID, search string, page, limit int) ([]Device, int, error) {
    if limit <= 0 || limit > 100 {
        limit = 30
    }
    if page <= 0 {
        page = 1
    }
    offset := (page - 1) * limit
    return s.ListDevicesRepository(ctx, orgID, strings.TrimSpace(search), limit, offset)
}

func (s *App) UpdateDeviceService(ctx context.Context, id string, req UpdateDeviceRequest) (*Device, error) {
    if _, err := uuid.Parse(id); err != nil {
        return nil, ErrInvalidDeviceID
    }

    var namePtr *string
    if req.Name != nil {
        trimmed := strings.TrimSpace(*req.Name)
        if trimmed == "" {
            return nil, ErrEmptyDeviceName
        }
        namePtr = &trimmed
    }

    device, err := s.UpdateDeviceRepository(ctx, id, namePtr, req.ExpiresAt)
    if err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            return nil, ErrDeviceNotFound
        }
        return nil, err
    }
    return device, nil
}

func (s *App) RegeneratePINService(ctx context.Context, id string) (*Device, error) {
    if _, err := uuid.Parse(id); err != nil {
        return nil, ErrInvalidDeviceID
    }

    pin, err := generatePIN()
    if err != nil {
        return nil, fmt.Errorf("failed to generate pin: %w", err)
    }

    pinExpiresAt := time.Now().Add(5 * time.Minute)
    device, err := s.UpdateDevicePINRepository(ctx, id, pin, pinExpiresAt)
    if err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            return nil, ErrDeviceNotFound
        }
        return nil, err
    }
    return device, nil
}

func (s *App) DeleteDeviceService(ctx context.Context, id string) error {
    if _, err := uuid.Parse(id); err != nil {
        return ErrInvalidDeviceID
    }

    err := s.DeleteDeviceRepository(ctx, id)
    if err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            return ErrDeviceNotFound
        }
        return err
    }
    return nil
}

func (s *App) VerifyDeviceService(ctx context.Context, clientIP string, req VerifyDeviceRequest) (*VerifyDeviceResponse, error) {
    if err := s.checkVerifyRateLimit(ctx, clientIP); err != nil {
        return nil, err
    }

    pin := strings.TrimSpace(req.PIN)
    fingerprint := strings.TrimSpace(req.Fingerprint)
    actualName := strings.TrimSpace(req.ActualName)

    if pin == "" {
        return nil, ErrInvalidPIN
    }
    if fingerprint == "" {
        fingerprint = "fp_" + uuid.NewString()
    }
    if actualName == "" {
        actualName = "Web Scanner Device"
    }

    rawToken, tokenHash, err := generateDeviceToken()
    if err != nil {
        return nil, fmt.Errorf("failed to generate token: %w", err)
    }

    updatedDevice, err := s.VerifyDeviceByPINRepository(ctx, pin, fingerprint, actualName, tokenHash)
    if err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            tooMany, _ := s.recordFailedVerifyAttempt(ctx, clientIP, pin)
            if tooMany {
                return nil, ErrTooManyWrongGuesses
            }
            return nil, ErrInvalidPIN
        }
        return nil, fmt.Errorf("failed to verify device: %w", err)
    }

    s.clearFailedVerifyAttempts(ctx, clientIP)

    return &VerifyDeviceResponse{
        DeviceID:            updatedDevice.ID,
        Name:                updatedDevice.Name,
        ActualName:          actualName,
        Token:               rawToken,
        IsBiometricEnrolled: updatedDevice.IsBiometricEnrolled,
        ExpiresAt:           updatedDevice.ExpiresAt,
    }, nil
}

func (s *App) WebAuthnRegisterOptionsService(ctx context.Context, clientIP string, req WebAuthnRegisterOptionsRequest) (*WebAuthnRegisterOptionsResponse, error) {
    if err := s.checkVerifyRateLimit(ctx, clientIP); err != nil {
        return nil, err
    }

    pin := strings.TrimSpace(req.PIN)
    if pin == "" {
        return nil, ErrInvalidPIN
    }

    if s.WebAuthn == nil {
        return nil, errors.New("webauthn is not configured")
    }

    device, err := s.GetDeviceByActivePINRepository(ctx, pin)
    if err != nil {
        tooMany, _ := s.recordFailedVerifyAttempt(ctx, clientIP, pin)
        if tooMany {
            return nil, ErrTooManyWrongGuesses
        }
        return nil, ErrInvalidPIN
    }

    creation, sessionData, err := s.WebAuthn.BeginRegistration(
        device,
        webauthn.WithAuthenticatorSelection(protocol.AuthenticatorSelection{
            AuthenticatorAttachment: protocol.Platform,
            UserVerification:        protocol.VerificationRequired,
            ResidentKey:             protocol.ResidentKeyRequirementPreferred,
        }),
        webauthn.WithRegistrationRelyingPartyID(s.RPID),
        webauthn.WithRegistrationOrigin(s.CanonicalOrigin),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create registration challenge: %w", err)
    }

    sessionID := "reg_" + uuid.NewString()
    if s.Redis != nil {
        stored := StoredWebAuthnSession{
            DeviceID:    device.ID,
            ActualName:  strings.TrimSpace(req.ActualName),
            RPID:        s.RPID,
            Origin:      s.CanonicalOrigin,
            SessionData: *sessionData,
        }
        data, _ := json.Marshal(stored)
        _ = s.Redis.Set(ctx, fmt.Sprintf("webauthn:session:%s", sessionID), data, 2*time.Minute).Err()
    }

    return &WebAuthnRegisterOptionsResponse{
        SessionID: sessionID,
        Options:   creation.Response,
    }, nil
}

func (s *App) WebAuthnRegisterVerifyService(ctx context.Context, clientIP string, req WebAuthnRegisterVerifyRequest) (*VerifyDeviceResponse, error) {
    if err := s.checkVerifyRateLimit(ctx, clientIP); err != nil {
        return nil, err
    }

    sessionID := strings.TrimSpace(req.SessionID)
    if sessionID == "" || s.Redis == nil {
        return nil, ErrWebAuthnSessionExpired
    }

    key := fmt.Sprintf("webauthn:session:%s", sessionID)
    rawBytes, err := s.Redis.Get(ctx, key).Bytes()
    if err != nil {
        return nil, ErrWebAuthnSessionExpired
    }

    var stored StoredWebAuthnSession
    if err := json.Unmarshal(rawBytes, &stored); err != nil {
        return nil, ErrWebAuthnSessionExpired
    }

    device, err := s.GetDeviceByIDRepository(ctx, stored.DeviceID)
    if err != nil {
        return nil, ErrDeviceNotFound
    }

    parsedResponse, err := protocol.ParseCredentialCreationResponseBody(bytes.NewReader(req.Response))
    if err != nil {
        return nil, fmt.Errorf("invalid credential payload: %w", err)
    }

    if s.WebAuthn == nil {
        return nil, errors.New("webauthn is not configured")
    }

    credential, err := s.WebAuthn.CreateCredential(device, stored.SessionData, parsedResponse)
    if err != nil {
        return nil, fmt.Errorf("%w: %v", ErrWebAuthnVerificationFailed, err)
    }

    credID := base64.RawURLEncoding.EncodeToString(credential.ID)
    pubKey := base64.RawURLEncoding.EncodeToString(credential.PublicKey)
    aaguid := hex.EncodeToString(credential.Authenticator.AAGUID)
    credBytes, _ := json.Marshal(credential)
    credJSON := string(credBytes)

    actualName := strings.TrimSpace(req.ActualName)
    if actualName == "" {
        actualName = stored.ActualName
    }
    if actualName == "" {
        actualName = "WebAuthn Verified Device"
    }

    rawToken, tokenHash, err := generateDeviceToken()
    if err != nil {
        return nil, fmt.Errorf("failed to generate token: %w", err)
    }

    fingerprint := strings.TrimSpace(req.Fingerprint)
    var fpPtr *string
    if fingerprint != "" {
        fpPtr = &fingerprint
    }

    updatedDevice, err := s.UpdateDeviceWebAuthnCredentialRepository(
        ctx,
        device.ID,
        credID,
        pubKey,
        aaguid,
        credential.Authenticator.SignCount,
        credJSON,
        fpPtr,
        &actualName,
        &tokenHash,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to save credential: %w", err)
    }

    _ = s.Redis.Del(ctx, key).Err()
    s.clearFailedVerifyAttempts(ctx, clientIP)

    return &VerifyDeviceResponse{
        DeviceID:            updatedDevice.ID,
        Name:                updatedDevice.Name,
        ActualName:          actualName,
        Token:               rawToken,
        IsBiometricEnrolled: true,
        ExpiresAt:           updatedDevice.ExpiresAt,
    }, nil
}

func (s *App) WebAuthnLoginOptionsService(ctx context.Context, clientIP string, req WebAuthnLoginOptionsRequest) (*WebAuthnLoginOptionsResponse, error) {
    if err := s.checkVerifyRateLimit(ctx, clientIP); err != nil {
        return nil, err
    }

    if s.WebAuthn == nil {
        return nil, errors.New("webauthn is not configured")
    }

    var device *Device
    var err error

    credID := strings.TrimSpace(req.CredentialID)
    deviceID := strings.TrimSpace(req.DeviceID)

    if credID != "" {
        device, err = s.GetDeviceByWebAuthnCredentialIDRepository(ctx, credID)
    } else if deviceID != "" {
        device, err = s.GetDeviceByIDRepository(ctx, deviceID)
    } else {
        return nil, errors.New("missing device_id or credential_id")
    }

    if err != nil {
        return nil, ErrDeviceNotFound
    }

    if !device.IsBiometricEnrolled || len(device.WebAuthnCredentials()) == 0 {
        return nil, ErrWebAuthnNotEnrolled
    }

    if device.IsExpired {
        return nil, ErrDeviceExpired
    }

    assertion, sessionData, err := s.WebAuthn.BeginLogin(
        device,
        webauthn.WithUserVerification(protocol.VerificationPreferred),
        webauthn.WithLoginRelyingPartyID(s.RPID),
        webauthn.WithLoginOrigin(s.CanonicalOrigin),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create login challenge: %w", err)
    }

    sessionID := "login_" + uuid.NewString()
    if s.Redis != nil {
        stored := StoredWebAuthnSession{
            DeviceID:    device.ID,
            RPID:        s.RPID,
            Origin:      s.CanonicalOrigin,
            SessionData: *sessionData,
        }
        data, _ := json.Marshal(stored)
        _ = s.Redis.Set(ctx, fmt.Sprintf("webauthn:session:%s", sessionID), data, 2*time.Minute).Err()
    }

    return &WebAuthnLoginOptionsResponse{
        SessionID: sessionID,
        Options:   assertion.Response,
    }, nil
}

func (s *App) WebAuthnLoginVerifyService(ctx context.Context, clientIP string, req WebAuthnLoginVerifyRequest) (*VerifyDeviceResponse, error) {
    if err := s.checkVerifyRateLimit(ctx, clientIP); err != nil {
        return nil, err
    }

    sessionID := strings.TrimSpace(req.SessionID)
    if sessionID == "" || s.Redis == nil {
        return nil, ErrWebAuthnSessionExpired
    }

    key := fmt.Sprintf("webauthn:session:%s", sessionID)
    rawBytes, err := s.Redis.Get(ctx, key).Bytes()
    if err != nil {
        return nil, ErrWebAuthnSessionExpired
    }

    var stored StoredWebAuthnSession
    if err := json.Unmarshal(rawBytes, &stored); err != nil {
        return nil, ErrWebAuthnSessionExpired
    }

    device, err := s.GetDeviceByIDRepository(ctx, stored.DeviceID)
    if err != nil {
        return nil, ErrDeviceNotFound
    }

    parsedAssertion, err := protocol.ParseCredentialRequestResponseBody(bytes.NewReader(req.Response))
    if err != nil {
        return nil, fmt.Errorf("invalid assertion payload: %w", err)
    }

    if s.WebAuthn == nil {
        return nil, errors.New("webauthn is not configured")
    }

    cred, err := s.WebAuthn.ValidateLogin(device, stored.SessionData, parsedAssertion)
    if err != nil {
        return nil, fmt.Errorf("%w: %v", ErrWebAuthnVerificationFailed, err)
    }

    rawToken, tokenHash, err := generateDeviceToken()
    if err != nil {
        return nil, fmt.Errorf("failed to generate token: %w", err)
    }

    updatedDevice, err := s.UpdateDeviceWebAuthnSignCountRepository(
        ctx,
        device.ID,
        cred.Authenticator.SignCount,
        &tokenHash,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to update sign count: %w", err)
    }

    _ = s.Redis.Del(ctx, key).Err()
    s.clearFailedVerifyAttempts(ctx, clientIP)

    actualNameStr := ""
    if updatedDevice.ActualName != nil {
        actualNameStr = *updatedDevice.ActualName
    }

    return &VerifyDeviceResponse{
        DeviceID:            updatedDevice.ID,
        Name:                updatedDevice.Name,
        ActualName:          actualNameStr,
        Token:               rawToken,
        IsBiometricEnrolled: true,
        ExpiresAt:           updatedDevice.ExpiresAt,
    }, nil
}

func (s *App) AuthenticateDeviceTokenService(ctx context.Context, token string) (*Device, error) {
    trimmed := strings.TrimSpace(token)
    if trimmed == "" {
        return nil, errors.New("empty device token")
    }

    tHash := hashToken(trimmed)
    device, err := s.GetDeviceByTokenHashRepository(ctx, tHash)
    if err != nil {
        if errors.Is(err, postgres.ErrNotFound) {
            return nil, ErrDeviceNotFound
        }
        return nil, err
    }

    if device.IsExpired {
        return nil, ErrDeviceExpired
    }

    if s.Redis != nil {
        throttleKey := fmt.Sprintf(generic.RedisKeyDeviceThrottle, device.ID)
        if set, _ := s.Redis.SetNX(ctx, throttleKey, "1", 60*time.Second).Result(); set {
            go func() {
                bgCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
                defer cancel()
                _ = s.TouchDeviceActiveRepository(bgCtx, device.ID)
            }()
        }
    } else {
        go func() {
            bgCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
            defer cancel()
            _ = s.TouchDeviceActiveRepository(bgCtx, device.ID)
        }()
    }

    return device, nil
}
