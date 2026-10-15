-- 1. Create devices table (global pool of scanning hardware)
CREATE TABLE IF NOT EXISTS devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    actual_name     TEXT NULL,
    fingerprint     TEXT UNIQUE NULL,
    pin             VARCHAR(6) NULL,
    pin_expires_at  TIMESTAMPTZ NULL,
    expires_at      TIMESTAMPTZ NULL,
    token_hash              TEXT NULL,
    last_active_at          TIMESTAMPTZ NULL,
    webauthn_credential_id  TEXT UNIQUE NULL,
    webauthn_public_key     TEXT NULL,
    webauthn_aaguid         TEXT NULL,
    webauthn_sign_count     BIGINT NOT NULL DEFAULT 0,
    webauthn_credential_json JSONB NULL,
    is_biometric_enrolled   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devices_pin ON devices (pin) WHERE pin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices (fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_webauthn_cred ON devices (webauthn_credential_id) WHERE webauthn_credential_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_organization ON devices (organization_id, created_at DESC);

-- 2. Create event_devices junction table mapping devices to events
CREATE TABLE IF NOT EXISTS event_devices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    device_id   UUID NOT NULL REFERENCES devices (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_event_devices_event_device UNIQUE (event_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_event_devices_event_id ON event_devices (event_id);
CREATE INDEX IF NOT EXISTS idx_event_devices_device_id ON event_devices (device_id);
CREATE INDEX IF NOT EXISTS idx_event_devices_created_at ON event_devices (created_at DESC);
