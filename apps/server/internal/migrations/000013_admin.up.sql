-- Platform admin: client suspension, granted and revoked credits, refunds,
-- the income/expense ledger and the business's own subscriptions.

-- A suspended organization cannot log in and its public forms and scanners
-- stop accepting writes.
ALTER TABLE organizations ADD COLUMN suspended_at TIMESTAMPTZ NULL;

-- 'granted': created by the admin without payment.
-- revoked_at: the admin ended the credit early (refund); ends_at moves to
-- that moment so every expiry rule applies unchanged.
ALTER TABLE credits DROP CONSTRAINT credits_kind_check;
ALTER TABLE credits ADD CONSTRAINT credits_kind_check CHECK (kind IN ('trial', 'paid', 'granted'));
ALTER TABLE credits ADD COLUMN revoked_at TIMESTAMPTZ NULL;

-- The admin can reset a client's trial choice, so the trial may be claimed
-- again; organizations.trial_choice alone decides whether it is available.
DROP INDEX uq_credits_one_trial;

ALTER TABLE payments DROP CONSTRAINT payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (status IN ('created', 'paid', 'refunded'));
ALTER TABLE payments ADD COLUMN refunded_at TIMESTAMPTZ NULL;
ALTER TABLE payments ADD COLUMN refund_note TEXT NOT NULL DEFAULT '';

-- Categories for manual ledger entries and subscriptions.
CREATE TABLE transaction_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_transaction_categories_name ON transaction_categories (kind, lower(name));

-- The business's own recurring costs (hosting, email, domain...).
-- Renewals are confirmed by the admin, which records an expense and moves
-- next_due_on forward by interval_months.
CREATE TABLE business_subscriptions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    vendor           TEXT NOT NULL DEFAULT '',
    amount           BIGINT NOT NULL CHECK (amount >= 0),
    currency         TEXT NOT NULL DEFAULT 'INR',
    interval_months  INT NOT NULL CHECK (interval_months >= 1),
    next_due_on      DATE NOT NULL,
    category_id      UUID NULL REFERENCES transaction_categories (id) ON DELETE SET NULL,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    notes            TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_subscriptions_due ON business_subscriptions (next_due_on) WHERE is_active;

-- The ledger. Amounts are positive; kind gives the direction.
--   income  / payment       a client payment (written by payment fulfilment)
--   refund  / payment       that payment refunded by the admin
--   income | expense / manual        entered by the admin
--   expense / subscription  a confirmed subscription renewal
CREATE TABLE transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind             TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'refund')),
    source           TEXT NOT NULL CHECK (source IN ('payment', 'manual', 'subscription')),
    amount           BIGINT NOT NULL CHECK (amount > 0),
    currency         TEXT NOT NULL DEFAULT 'INR',
    description      TEXT NOT NULL DEFAULT '',
    occurred_on      DATE NOT NULL DEFAULT CURRENT_DATE,
    category_id      UUID NULL REFERENCES transaction_categories (id) ON DELETE SET NULL,
    payment_id       UUID NULL REFERENCES payments (id) ON DELETE SET NULL,
    subscription_id  UUID NULL REFERENCES business_subscriptions (id) ON DELETE SET NULL,
    organization_id  UUID NULL REFERENCES organizations (id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_transaction_source CHECK (
        (source = 'payment' AND kind IN ('income', 'refund'))
        OR (source = 'manual' AND kind IN ('income', 'expense'))
        OR (source = 'subscription' AND kind = 'expense')
    )
);

CREATE INDEX idx_transactions_occurred ON transactions (occurred_on DESC, created_at DESC);
CREATE UNIQUE INDEX uq_transactions_payment ON transactions (payment_id, kind) WHERE payment_id IS NOT NULL;

-- Entitlements also report whether the credit's organization is suspended.
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
    bool_or(o.suspended_at IS NOT NULL) AS is_suspended
FROM credits c
JOIN organizations o ON o.id = c.organization_id
LEFT JOIN credit_features cf ON cf.credit_id = c.id
LEFT JOIN features f ON f.id = cf.feature_id
GROUP BY c.id;
