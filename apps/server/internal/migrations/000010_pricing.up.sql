-- Feature catalog for credit pricing. Features are rows, never columns:
-- a new feature is an INSERT, not a schema change. `key` is the stable id
-- that enforcement code refers to; everything else is editable.
CREATE TABLE features (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key           TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    value_type    TEXT NOT NULL CHECK (value_type IN ('number', 'boolean')),
    unit          TEXT NOT NULL DEFAULT '',
    -- flat:     value >= 1 pays the rate's price once (on/off features)
    -- per_unit: price * ceil(value / unit_size)
    -- tiered:   price of the band whose [min_value, max_value] holds value
    pricing_type  TEXT NOT NULL CHECK (pricing_type IN ('flat', 'per_unit', 'tiered')),
    default_value INT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    sort_order    INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Preset values a client can pick for a feature.
CREATE TABLE feature_options (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id  UUID NOT NULL REFERENCES features (id) ON DELETE CASCADE,
    value       INT NOT NULL CHECK (value >= 0),
    label       TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    sort_order  INT NOT NULL DEFAULT 0,

    CONSTRAINT uq_feature_option_value UNIQUE (feature_id, value)
);

-- Base prices. Amounts are in the smallest currency unit (paise).
CREATE TABLE feature_rates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id  UUID NOT NULL REFERENCES features (id) ON DELETE CASCADE,
    min_value   INT NOT NULL DEFAULT 0,
    max_value   INT NULL,
    unit_size   INT NOT NULL DEFAULT 1 CHECK (unit_size >= 1),
    price       BIGINT NOT NULL CHECK (price >= 0),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_feature_rate_range CHECK (max_value IS NULL OR max_value >= min_value)
);

CREATE INDEX idx_feature_options_feature ON feature_options (feature_id, sort_order);
CREATE INDEX idx_feature_rates_feature ON feature_rates (feature_id, min_value);

-- Credit-wide pricing settings: always exactly one row (id = 1).
CREATE TABLE pricing_settings (
    id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    currency    TEXT NOT NULL DEFAULT 'INR',
    base_fee    BIGINT NOT NULL DEFAULT 0 CHECK (base_fee >= 0),
    tax_name    TEXT NOT NULL DEFAULT 'GST',
    tax_rate_bp INT NOT NULL DEFAULT 0 CHECK (tax_rate_bp >= 0), -- basis points: 1800 = 18%
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Placeholder catalog; prices are editable later from the admin app.
INSERT INTO pricing_settings (currency, base_fee, tax_name, tax_rate_bp)
VALUES ('INR', 49900, 'GST', 1800);

WITH f AS (
    INSERT INTO features (key, name, description, value_type, unit, pricing_type, default_value, sort_order) VALUES
        ('applicants', 'Applicants', 'Maximum number of registered applicants', 'number', 'applicants', 'tiered', 100, 1),
        ('duration', 'Event duration', 'Maximum length of the event', 'number', 'days', 'per_unit', 1, 2),
        ('branding', 'Custom branding', 'Your own branding on forms and ID cards', 'boolean', '', 'flat', 0, 3),
        ('sub_events', 'Sub-events', 'Number of sub-events inside the event', 'number', 'sub-events', 'tiered', 0, 4),
        ('backup_days', 'Data backup', 'Days the event data is kept after the event ends', 'number', 'days', 'tiered', 7, 5)
    RETURNING id, key
),
opts AS (
    INSERT INTO feature_options (feature_id, value, label, sort_order)
    SELECT f.id, o.value, o.label, o.sort_order
    FROM f
    JOIN (VALUES
        ('applicants', 100, '100', 1), ('applicants', 250, '250', 2), ('applicants', 500, '500', 3),
        ('applicants', 1000, '1,000', 4), ('applicants', 2500, '2,500', 5), ('applicants', 5000, '5,000', 6),
        ('duration', 1, '1 day', 1), ('duration', 2, '2 days', 2), ('duration', 3, '3 days', 3),
        ('duration', 5, '5 days', 4), ('duration', 7, '7 days', 5), ('duration', 15, '15 days', 6),
        ('duration', 30, '30 days', 7),
        ('branding', 0, 'No', 1), ('branding', 1, 'Yes', 2),
        ('sub_events', 0, 'None', 1), ('sub_events', 3, 'Up to 3', 2), ('sub_events', 5, 'Up to 5', 3),
        ('sub_events', 10, 'Up to 10', 4),
        ('backup_days', 7, '7 days', 1), ('backup_days', 30, '30 days', 2), ('backup_days', 90, '90 days', 3),
        ('backup_days', 180, '180 days', 4), ('backup_days', 365, '1 year', 5)
    ) AS o (key, value, label, sort_order) ON o.key = f.key
)
INSERT INTO feature_rates (feature_id, min_value, max_value, unit_size, price)
SELECT f.id, r.min_value, r.max_value, r.unit_size, r.price
FROM f
JOIN (VALUES
    ('applicants', 1, 100, 1, 29900), ('applicants', 101, 250, 1, 59900), ('applicants', 251, 500, 1, 99900),
    ('applicants', 501, 1000, 1, 179900), ('applicants', 1001, 2500, 1, 399900), ('applicants', 2501, 5000, 1, 699900),
    ('duration', 0, NULL, 1, 19900),
    ('branding', 1, NULL, 1, 99900),
    ('sub_events', 1, 3, 1, 49900), ('sub_events', 4, 5, 1, 79900), ('sub_events', 6, 10, 1, 129900),
    ('backup_days', 1, 7, 1, 0), ('backup_days', 8, 30, 1, 29900), ('backup_days', 31, 90, 1, 69900),
    ('backup_days', 91, 180, 1, 119900), ('backup_days', 181, 365, 1, 199900)
) AS r (key, min_value, max_value, unit_size, price) ON r.key = f.key;
