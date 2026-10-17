DROP TABLE IF EXISTS event_sites;

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
    c.ends_at + make_interval(days => COALESCE(MAX(cf.value) FILTER (WHERE f.key = 'backup_days'), 0)) AS prune_at,
    bool_or(o.suspended_at IS NOT NULL) AS is_suspended
FROM credits c
JOIN organizations o ON o.id = c.organization_id
LEFT JOIN credit_features cf ON cf.credit_id = c.id
LEFT JOIN features f ON f.id = cf.feature_id
GROUP BY c.id;

DELETE FROM credit_features WHERE feature_id IN (SELECT id FROM features WHERE key = 'event_site');
DELETE FROM features WHERE key = 'event_site';
