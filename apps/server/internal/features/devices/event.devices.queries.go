package devices

const (
    ListEventDevicesQuery = `
        SELECT
            d.id,
            d.name,
            d.actual_name,
            d.fingerprint,
            d.pin,
            d.pin_expires_at,
            d.expires_at,
            d.last_active_at,
            d.webauthn_credential_id,
            d.webauthn_public_key,
            d.webauthn_aaguid,
            d.webauthn_sign_count,
            d.webauthn_credential_json::text,
            d.is_biometric_enrolled,
            d.created_at,
            d.updated_at,
            ed.id,
            ed.created_at
        FROM event_devices ed
        JOIN devices d ON d.id = ed.device_id
        WHERE ed.event_id = $1
        ORDER BY ed.created_at DESC;
    `

    ListAvailableGlobalDevicesQuery = `
        SELECT
            d.id,
            d.name,
            d.actual_name,
            d.fingerprint,
            d.pin,
            d.pin_expires_at,
            d.expires_at,
            d.last_active_at,
            d.webauthn_credential_id,
            d.webauthn_public_key,
            d.webauthn_aaguid,
            d.webauthn_sign_count,
            d.webauthn_credential_json::text,
            d.is_biometric_enrolled,
            d.created_at,
            d.updated_at
        FROM devices d
        WHERE d.organization_id = (SELECT organization_id FROM events WHERE id = $1::uuid)
          AND d.id NOT IN (
            SELECT device_id FROM event_devices WHERE event_id = $1
        )
        ORDER BY d.created_at DESC;
    `

    AssignEventDeviceQuery = `
        INSERT INTO event_devices (event_id, device_id, created_at)
        SELECT e.id, d.id, now()
        FROM events e
        JOIN devices d ON d.organization_id = e.organization_id
        WHERE e.id = $1::uuid AND d.id = $2::uuid
        ON CONFLICT (event_id, device_id) DO NOTHING;
    `

    UnassignEventDeviceQuery = `
        DELETE FROM event_devices
        WHERE event_id = $1 AND device_id = $2;
    `
)
