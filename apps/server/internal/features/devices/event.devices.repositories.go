package devices

import (
    "context"
    "time"

    "github.com/jackc/pgx/v5"
    "identitycard-server/internal/pkg/postgres"
)

func (r *App) ListEventDevicesRepository(ctx context.Context, eventID string) ([]EventDeviceAssignment, error) {
    rows, err := r.DB.Query(ctx, ListEventDevicesQuery, eventID)
    if err != nil {
        return nil, postgres.MapPgError(err)
    }
    defer rows.Close()

    var assignments []EventDeviceAssignment
    for rows.Next() {
        var d Device
        var assignID string
        var assignCreatedAt time.Time
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
            &assignID,
            &assignCreatedAt,
        )
        if err != nil {
            return nil, postgres.MapPgError(err)
        }
        d.IsPaired = (d.Fingerprint != nil && *d.Fingerprint != "") || d.IsBiometricEnrolled
        d.IsExpired = d.ExpiresAt != nil && time.Now().After(*d.ExpiresAt)
        assignments = append(assignments, EventDeviceAssignment{
            ID:        assignID,
            EventID:   eventID,
            DeviceID:  d.ID,
            Device:    d,
            CreatedAt: assignCreatedAt,
        })
    }
    if err := rows.Err(); err != nil {
        return nil, postgres.MapPgError(err)
    }
    if assignments == nil {
        assignments = []EventDeviceAssignment{}
    }
    return assignments, nil
}

func (r *App) ListAvailableGlobalDevicesRepository(ctx context.Context, eventID string) ([]Device, error) {
    rows, err := r.DB.Query(ctx, ListAvailableGlobalDevicesQuery, eventID)
    if err != nil {
        return nil, postgres.MapPgError(err)
    }
    return scanDevices(rows)
}

func (r *App) AssignEventDevicesRepository(ctx context.Context, eventID string, deviceIDs []string) error {
    b := &pgx.Batch{}
    for _, devID := range deviceIDs {
        b.Queue(AssignEventDeviceQuery, eventID, devID)
    }
    br := r.DB.SendBatch(ctx, b)
    defer br.Close()

    for range deviceIDs {
        if _, err := br.Exec(); err != nil {
            return postgres.MapPgError(err)
        }
    }
    return nil
}

func (r *App) UnassignEventDeviceRepository(ctx context.Context, eventID string, deviceID string) error {
    tag, err := r.DB.Exec(ctx, UnassignEventDeviceQuery, eventID, deviceID)
    if err != nil {
        return postgres.MapPgError(err)
    }
    if tag.RowsAffected() == 0 {
        return postgres.ErrNotFound
    }
    return nil
}
