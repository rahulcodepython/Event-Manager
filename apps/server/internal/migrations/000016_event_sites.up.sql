-- Event sites: an uploaded static site per event at <slug>.<SITES_DOMAIN>.

-- New priced feature. The price and trial value are placeholders; set
-- them in the admin catalog.
WITH f AS (
    INSERT INTO features (key, name, description, value_type, unit, pricing_type, default_value, trial_value, sort_order)
    VALUES ('event_site', 'Event website', 'Your own website for the event at a custom subdomain', 'boolean', '', 'flat', 0, 0, 6)
    RETURNING id
),
opts AS (
    INSERT INTO feature_options (feature_id, value, label, sort_order)
    SELECT f.id, o.value, o.label, o.sort_order FROM f
    CROSS JOIN (VALUES (0, 'No', 1), (1, 'Yes', 2)) AS o (value, label, sort_order)
)
INSERT INTO feature_rates (feature_id, min_value, max_value, unit_size, price)
SELECT f.id, 1, NULL, 1, 99900 FROM f;

CREATE OR REPLACE VIEW credit_entitlements AS
SELECT
    c.id AS credit_id,
    c.organization_id,
    c.kind,
    c.starts_at,
    c.ends_at,
    c.ends_at <= now() AS is_expired,
    COALESCE(MAX(cf.value) FILTER (WHERE f.key = 'applicants'), 0) AS applicant_limit,
    COALESCE(MAX(cf.value) FILTER (WHERE f.key = 'branding'), 0) > 0 AS has_branding,
    COALESCE(MAX(cf.value) FILTER (WHERE f.key = 'sub_events'), 0) AS sub_event_limit,
    COALESCE(MAX(cf.value) FILTER (WHERE f.key = 'backup_days'), 0) AS backup_days,
    c.ends_at + make_interval(days => COALESCE(MAX(cf.value) FILTER (WHERE f.key = 'backup_days'), 0)) AS prune_at,
    bool_or(o.suspended_at IS NOT NULL) AS is_suspended,
    COALESCE(MAX(cf.value) FILTER (WHERE f.key = 'event_site'), 0) > 0 AS has_event_site
FROM credits c
JOIN organizations o ON o.id = c.organization_id
LEFT JOIN credit_features cf ON cf.credit_id = c.id
LEFT JOIN features f ON f.id = cf.feature_id
GROUP BY c.id;

-- One site per event. The slug is freed when the event is deleted.
-- version names the folder of the current upload (sites/<event>/<version>/),
-- so a new upload goes live in one update.
CREATE TABLE event_sites (
    event_id     UUID PRIMARY KEY REFERENCES events (id) ON DELETE CASCADE,
    slug         TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{1,38})[a-z0-9]$'),
    version      TEXT NULL,
    file_count   INT NOT NULL DEFAULT 0,
    total_bytes  BIGINT NOT NULL DEFAULT 0,
    uploaded_at  TIMESTAMPTZ NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
