-- What a credit allows, flattened from credit_features by feature key.
-- The single place SQL reads limits; Go reads it through internal/pkg/entitlements.
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
