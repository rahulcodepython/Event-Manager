-- Trial credit: each feature's value on the one-time free trial, plus a
-- trial-only cap on the event's own length.
ALTER TABLE features ADD COLUMN trial_value INT NOT NULL DEFAULT 0;
ALTER TABLE pricing_settings ADD COLUMN trial_max_event_days INT NOT NULL DEFAULT 5 CHECK (trial_max_event_days >= 1);

UPDATE features SET trial_value = v.value
FROM (VALUES
    ('applicants', 25),
    ('duration', 15),
    ('branding', 1),
    ('sub_events', 3),
    ('backup_days', 0)
) AS v (key, value)
WHERE features.key = v.key;

-- NULL = not decided yet (show the trial step), else 'claimed' or 'skipped'.
ALTER TABLE organizations ADD COLUMN trial_choice TEXT NULL CHECK (trial_choice IN ('claimed', 'skipped'));

-- A credit lets one event at a time exist between starts_at and ends_at.
CREATE TABLE credits (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    kind             TEXT NOT NULL CHECK (kind IN ('trial', 'paid')),
    currency         TEXT NOT NULL DEFAULT 'INR',
    subtotal         BIGINT NOT NULL DEFAULT 0,
    tax              BIGINT NOT NULL DEFAULT 0,
    total            BIGINT NOT NULL DEFAULT 0,
    starts_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at          TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_credit_window CHECK (ends_at > starts_at)
);

CREATE INDEX idx_credits_organization ON credits (organization_id, created_at DESC);
CREATE UNIQUE INDEX uq_credits_one_trial ON credits (organization_id) WHERE kind = 'trial';

-- What a credit includes: one row per feature, price copied at purchase.
CREATE TABLE credit_features (
    credit_id   UUID NOT NULL REFERENCES credits (id) ON DELETE CASCADE,
    feature_id  UUID NOT NULL REFERENCES features (id) ON DELETE RESTRICT,
    value       INT NOT NULL,
    label       TEXT NOT NULL,
    amount      BIGINT NOT NULL DEFAULT 0,

    PRIMARY KEY (credit_id, feature_id)
);

-- Razorpay orders. The credit is created only once the payment is confirmed.
CREATE TABLE payments (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    credit_id            UUID NULL UNIQUE REFERENCES credits (id) ON DELETE SET NULL,
    credit_name          TEXT NOT NULL,
    quote                JSONB NOT NULL,
    amount               BIGINT NOT NULL CHECK (amount > 0),
    currency             TEXT NOT NULL,
    status               TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid')),
    razorpay_order_id    TEXT NOT NULL UNIQUE,
    razorpay_payment_id  TEXT NULL UNIQUE,
    paid_at              TIMESTAMPTZ NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_organization ON payments (organization_id, created_at DESC);

-- Every event runs on a credit; a credit serves at most one event at a time.
ALTER TABLE events ADD COLUMN credit_id UUID NOT NULL REFERENCES credits (id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX uq_events_credit ON events (credit_id);
