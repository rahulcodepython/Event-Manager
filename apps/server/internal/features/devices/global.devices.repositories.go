package devices

import (
    "context"
    "time"

    "github.com/jackc/pgx/v5"
    "identitycard-server/internal/pkg/postgres"
)

func scanDevice(row pgx.Row) (*Device, error) {
    var d Device
    err := row.Scan(
        &d.ID,
        &d.Name,
        &d.ActualName,
        &d.Fingerprint,
        &d.PIN,
        &d.PINExpiresAt,
        &d.ExpiresAt,
        &d.LastActiveAt,
        &d.WebAuthnCredentialID,
        &d.WebAuthnPublicKey,
        &d.WebAuthnAAGUID,
        &d.WebAuthnSignCount,
        &d.CredentialJSON,
        &d.IsBiometricEnrolled,
        &d.CreatedAt,
        &d.UpdatedAt,
    )
    if err != nil {
        return nil, postgres.MapPgError(err)
    }
    d.IsPaired = (d.Fingerprint != nil && *d.Fingerprint != "") || d.IsBiometricEnrolled
    d.IsExpired = d.ExpiresAt != nil && time.Now().After(*d.ExpiresAt)
    return &d, nil
}

func scanDevices(rows pgx.Rows) ([]Device, error) {
    defer rows.Close()
    var devices []Device
    for rows.Next() {
        var d Device
        err := rows.Scan(
            &d.ID,
            &d.Name,
            &d.ActualName,
            &d.Fingerprint,
            &d.PIN,
            &d.PINExpiresAt,
            &d.ExpiresAt,
            &d.LastActiveAt,
            &d.WebAuthnCredentialID,
            &d.WebAuthnPublicKey,
            &d.WebAuthnAAGUID,
            &d.WebAuthnSignCount,
            &d.CredentialJSON,
            &d.IsBiometricEnrolled,
            &d.CreatedAt,
            &d.UpdatedAt,
        )
        if err != nil {
            return nil, postgres.MapPgError(err)
        }
        d.IsPaired = (d.Fingerprint != nil && *d.Fingerprint != "") || d.IsBiometricEnrolled
        d.IsExpired = d.ExpiresAt != nil && time.Now().After(*d.ExpiresAt)
        devices = append(devices, d)
    }
    if err := rows.Err(); err != nil {
        return nil, postgres.MapPgError(err)
    }
    if devices == nil {
        devices = []Device{}
    }
    return devices, nil
}

func (r *App) CreateDeviceRepository(ctx context.Context, orgID, name string, pin string, pinExpiresAt time.Time, expiresAt *time.Time) (*Device, error) {
    row := r.DB.QueryRow(ctx, InsertDeviceQuery, name, pin, pinExpiresAt, expiresAt, orgID)
    return scanDevice(row)
}

func (r *App) GetDeviceByIDRepository(ctx context.Context, id string) (*Device, error) {
    row := r.DB.QueryRow(ctx, GetDeviceByIDQuery, id)
    return scanDevice(row)
}

func (r *App) GetDeviceByFingerprintRepository(ctx context.Context, fingerprint string) (*Device, error) {
    row := r.DB.QueryRow(ctx, GetDeviceByFingerprintQuery, fingerprint)
    return scanDevice(row)
}

func (r *App) GetDeviceByActivePINRepository(ctx context.Context, pin string) (*Device, error) {
    row := r.DB.QueryRow(ctx, GetDeviceByActivePINQuery, pin)
    return scanDevice(row)
}

func (r *App) GetDeviceByWebAuthnCredentialIDRepository(ctx context.Context, credentialID string) (*Device, error) {
    row := r.DB.QueryRow(ctx, GetDeviceByWebAuthnCredentialIDQuery, credentialID)
    return scanDevice(row)
}

func (r *App) ListDevicesRepository(ctx context.Context, orgID, search string, limit, offset int) ([]Device, int, error) {
    var total int
    err := r.DB.QueryRow(ctx, CountDevicesQuery, search, orgID).Scan(&total)
    if err != nil {
        return nil, 0, postgres.MapPgError(err)
    }

    rows, err := r.DB.Query(ctx, ListDevicesQuery, search, limit, offset, orgID)
    if err != nil {
        return nil, 0, postgres.MapPgError(err)
    }

    devices, err := scanDevices(rows)
    if err != nil {
        return nil, 0, err
    }

    return devices, total, nil
}

func (r *App) UpdateDeviceRepository(ctx context.Context, id string, name *string, expiresAt *time.Time) (*Device, error) {
    row := r.DB.QueryRow(ctx, UpdateDeviceQuery, id, name, expiresAt)
    return scanDevice(row)
}

func (r *App) UpdateDevicePINRepository(ctx context.Context, id string, pin string, pinExpiresAt time.Time) (*Device, error) {
    row := r.DB.QueryRow(ctx, UpdateDevicePINQuery, id, pin, pinExpiresAt)
    return scanDevice(row)
}

func (r *App) VerifyDeviceRepository(ctx context.Context, id string, fingerprint, actualName, tokenHash string) (*Device, error) {
    row := r.DB.QueryRow(ctx, VerifyDeviceQuery, id, fingerprint, actualName, tokenHash)
    return scanDevice(row)
}

func (r *App) VerifyDeviceByPINRepository(ctx context.Context, pin, fingerprint, actualName, tokenHash string) (*Device, error) {
    row := r.DB.QueryRow(ctx, VerifyDeviceByPINQuery, pin, fingerprint, actualName, tokenHash)
    return scanDevice(row)
}

func (r *App) UpdateDeviceWebAuthnCredentialRepository(
    ctx context.Context,
    id string,
    credentialID string,
    publicKey string,
    aaguid string,
    signCount uint32,
    credentialJSON string,
    fingerprint *string,
    actualName *string,
    tokenHash *string,
) (*Device, error) {
    row := r.DB.QueryRow(
        ctx,
        UpdateDeviceWebAuthnCredentialQuery,
        id,
        credentialID,
        publicKey,
        aaguid,
        signCount,
        credentialJSON,
        fingerprint,
        actualName,
        tokenHash,
    )
    return scanDevice(row)
}

func (r *App) UpdateDeviceWebAuthnSignCountRepository(
    ctx context.Context,
    id string,
    signCount uint32,
    tokenHash *string,
) (*Device, error) {
    row := r.DB.QueryRow(
        ctx,
        UpdateDeviceWebAuthnSignCountQuery,
        id,
        signCount,
        tokenHash,
    )
    return scanDevice(row)
}

func (r *App) GetDeviceByTokenHashRepository(ctx context.Context, tokenHash string) (*Device, error) {
    row := r.DB.QueryRow(ctx, GetDeviceByTokenHashQuery, tokenHash)
    return scanDevice(row)
}

func (r *App) TouchDeviceActiveRepository(ctx context.Context, id string) error {
    _, err := r.DB.Exec(ctx, TouchDeviceActiveQuery, id)
    return postgres.MapPgError(err)
}

func (r *App) DeleteDeviceRepository(ctx context.Context, id string) error {
    tag, err := r.DB.Exec(ctx, DeleteDeviceQuery, id)
    if err != nil {
        return postgres.MapPgError(err)
    }
    if tag.RowsAffected() == 0 {
        return postgres.ErrNotFound
    }
    return nil
}
