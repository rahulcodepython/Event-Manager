-- 1. Create event_forms table (independent snapshot, no foreign keys to templates)
CREATE TABLE IF NOT EXISTS event_forms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT 'Event Registration Form',
    fields          JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_applicants  INT NOT NULL DEFAULT -1,
    expires_at      TIMESTAMPTZ NOT NULL,
    status          TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'live')),
    is_locked       BOOLEAN NOT NULL DEFAULT false,
    locked_at       TIMESTAMPTZ NULL DEFAULT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_event_forms_event UNIQUE (event_id),
    CONSTRAINT chk_event_forms_max_applicants CHECK (max_applicants = -1 OR max_applicants >= 1)
);

CREATE INDEX IF NOT EXISTS idx_event_forms_event_id ON event_forms (event_id);
CREATE INDEX IF NOT EXISTS idx_event_forms_is_locked ON event_forms (is_locked);
CREATE INDEX IF NOT EXISTS idx_event_forms_status ON event_forms (status);

-- 2. Create form_fields relational table
CREATE TABLE IF NOT EXISTS form_fields (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID NULL REFERENCES form_templates (id) ON DELETE CASCADE,
    event_form_id   UUID NULL REFERENCES event_forms (id) ON DELETE CASCADE,
    field_type      TEXT NOT NULL REFERENCES field_types (type) ON UPDATE CASCADE,
    key             TEXT NOT NULL,
    label           TEXT NOT NULL,
    placeholder     TEXT NOT NULL DEFAULT '',
    required        BOOLEAN NOT NULL DEFAULT false,
    is_system       BOOLEAN NOT NULL DEFAULT false,
    order_index     INT NOT NULL DEFAULT 0,
    options         JSONB NOT NULL DEFAULT '[]'::jsonb,
    validation      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_form_fields_owner CHECK (
        (template_id IS NOT NULL AND event_form_id IS NULL) OR
        (template_id IS NULL AND event_form_id IS NOT NULL)
    ),
    CONSTRAINT uq_template_field_key UNIQUE (template_id, key),
    CONSTRAINT uq_event_form_field_key UNIQUE (event_form_id, key)
);

CREATE INDEX IF NOT EXISTS idx_form_fields_template_order ON form_fields (template_id, order_index);
CREATE INDEX IF NOT EXISTS idx_form_fields_event_form_order ON form_fields (event_form_id, order_index);
CREATE INDEX IF NOT EXISTS idx_form_fields_key ON form_fields (key);

-- 3. Create applicants table
CREATE TABLE IF NOT EXISTS applicants (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT NOT NULL DEFAULT '',
    data        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applicants_email ON applicants (email);
CREATE INDEX IF NOT EXISTS idx_applicants_phone ON applicants (phone);
CREATE INDEX IF NOT EXISTS idx_applicants_created_at ON applicants (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applicants_name_trgm ON applicants USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_applicants_email_trgm ON applicants USING GIN (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_applicants_phone_trgm ON applicants USING GIN (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_applicants_data_gin ON applicants USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_applicants_data_path_ops ON applicants USING GIN (data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_applicants_data_trgm ON applicants USING GIN ((data::text) gin_trgm_ops);

-- 4. Create event_applicants table
CREATE TABLE IF NOT EXISTS event_applicants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES applicants (id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          TEXT NOT NULL DEFAULT 'submitted',

    CONSTRAINT uq_event_applicants_event_email UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_event_applicants_event_id ON event_applicants (event_id);
CREATE INDEX IF NOT EXISTS idx_event_applicants_user_id ON event_applicants (user_id);
CREATE INDEX IF NOT EXISTS idx_event_applicants_created_at ON event_applicants (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_applicants_status ON event_applicants (event_id, status);
