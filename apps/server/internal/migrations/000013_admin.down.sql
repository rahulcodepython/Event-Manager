DROP VIEW IF EXISTS credit_entitlements;
CREATE VIEW credit_entitlements AS
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
    c.ends_at + make_interval(days => COALESCE(MAX(cf.value) FILTER (WHERE f.key = 'backup_days'), 0)) AS prune_at
FROM credits c
LEFT JOIN credit_features cf ON cf.credit_id = c.id
LEFT JOIN features f ON f.id = cf.feature_id
GROUP BY c.id;

DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS business_subscriptions;
DROP TABLE IF EXISTS transaction_categories;

-- Rows using the new states fall back to the closest old one.
UPDATE payments SET status = 'paid' WHERE status = 'refunded';
UPDATE credits SET kind = 'paid' WHERE kind = 'granted';

ALTER TABLE payments DROP COLUMN IF EXISTS refund_note;
ALTER TABLE payments DROP COLUMN IF EXISTS refunded_at;
ALTER TABLE payments DROP CONSTRAINT payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (status IN ('created', 'paid'));

CREATE UNIQUE INDEX uq_credits_one_trial ON credits (organization_id) WHERE kind = 'trial';

ALTER TABLE credits DROP COLUMN IF EXISTS revoked_at;
ALTER TABLE credits DROP CONSTRAINT credits_kind_check;
ALTER TABLE credits ADD CONSTRAINT credits_kind_check CHECK (kind IN ('trial', 'paid'));

ALTER TABLE organizations DROP COLUMN IF EXISTS suspended_at;
