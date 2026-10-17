package devices

const (
    InsertDeviceQuery = `
        INSERT INTO devices (
            organization_id,
            name,
            pin,
            pin_expires_at,
            expires_at,
            created_at,
            updated_at
        ) VALUES ($5::uuid, $1, $2, $3, $4, now(), now())
        RETURNING
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at;
    `

    GetDeviceByIDQuery = `
        SELECT
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at
        FROM devices
        WHERE id = $1;
    `

    GetDeviceByFingerprintQuery = `
        SELECT
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at
        FROM devices
        WHERE fingerprint = $1;
    `

    GetDeviceByActivePINQuery = `
        SELECT
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at
        FROM devices
        WHERE pin = $1 AND pin_expires_at > now();
    `

    GetDeviceByWebAuthnCredentialIDQuery = `
        SELECT
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at
        FROM devices
        WHERE webauthn_credential_id = $1;
    `

    ListDevicesQuery = `
        SELECT
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at
        FROM devices
        WHERE organization_id = $4::uuid
          AND ($1 = '' OR name ILIKE '%' || $1 || '%' OR COALESCE(actual_name, '') ILIKE '%' || $1 || '%')
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3;
    `

    CountDevicesQuery = `
        SELECT COUNT(*)
        FROM devices
        WHERE organization_id = $2::uuid
          AND ($1 = '' OR name ILIKE '%' || $1 || '%' OR COALESCE(actual_name, '') ILIKE '%' || $1 || '%');
    `

    UpdateDeviceQuery = `
        UPDATE devices
        SET
            name = COALESCE($2, name),
            expires_at = $3,
            updated_at = now()
        WHERE id = $1
        RETURNING
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at;
    `

    UpdateDevicePINQuery = `
        UPDATE devices
        SET
            pin = $2,
            pin_expires_at = $3,
            updated_at = now()
        WHERE id = $1
        RETURNING
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at;
    `

    VerifyDeviceQuery = `
        UPDATE devices
        SET
            fingerprint = $2,
            actual_name = $3,
            token_hash = $4,
            pin = NULL,
            pin_expires_at = NULL,
            last_active_at = now(),
            updated_at = now()
        WHERE id = $1
        RETURNING
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at;
    `

    VerifyDeviceByPINQuery = `
        UPDATE devices
        SET
            fingerprint = $2,
            actual_name = $3,
            token_hash = $4,
            pin = NULL,
            pin_expires_at = NULL,
            last_active_at = now(),
            updated_at = now()
        WHERE pin = $1 AND pin_expires_at > now()
        RETURNING
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at;
    `

    UpdateDeviceWebAuthnCredentialQuery = `
        UPDATE devices
        SET
            webauthn_credential_id = $2,
            webauthn_public_key = $3,
            webauthn_aaguid = $4,
            webauthn_sign_count = $5,
            webauthn_credential_json = $6::jsonb,
            is_biometric_enrolled = TRUE,
            fingerprint = COALESCE($7, fingerprint),
            actual_name = COALESCE($8, actual_name),
            token_hash = COALESCE($9, token_hash),
            pin = NULL,
            pin_expires_at = NULL,
            last_active_at = now(),
            updated_at = now()
        WHERE id = $1
        RETURNING
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at;
    `

    UpdateDeviceWebAuthnSignCountQuery = `
        UPDATE devices
        SET
            webauthn_sign_count = $2,
            token_hash = COALESCE($3, token_hash),
            last_active_at = now(),
            updated_at = now()
        WHERE id = $1
        RETURNING
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at;
    `

    GetDeviceByTokenHashQuery = `
        SELECT
            id,
            name,
            actual_name,
            fingerprint,
            pin,
            pin_expires_at,
            expires_at,
            last_active_at,
            webauthn_credential_id,
            webauthn_public_key,
            webauthn_aaguid,
            webauthn_sign_count,
            webauthn_credential_json::text,
            is_biometric_enrolled,
            created_at,
            updated_at
        FROM devices
        WHERE token_hash = $1;
    `

    TouchDeviceActiveQuery = `
        UPDATE devices
        SET last_active_at = now()
        WHERE id = $1;
    `

    DeleteDeviceQuery = `
        DELETE FROM devices
        WHERE id = $1;
    `
)
