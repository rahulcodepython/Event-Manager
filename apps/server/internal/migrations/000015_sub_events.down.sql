ALTER TABLE event_forms DROP COLUMN IF EXISTS sub_event_required;
ALTER TABLE event_forms DROP COLUMN IF EXISTS sub_event_mode;

DELETE FROM event_dates WHERE sub_event_id IS NOT NULL;
DROP INDEX IF EXISTS idx_event_dates_sub_event;
DROP INDEX IF EXISTS uq_event_dates_scope;
ALTER TABLE event_dates DROP COLUMN IF EXISTS sub_event_id;
ALTER TABLE event_dates ADD CONSTRAINT uq_event_date UNIQUE (event_id, date);

DROP TABLE IF EXISTS sub_event_applicants;
DROP INDEX IF EXISTS uq_event_applicants_event_user;
DROP TABLE IF EXISTS sub_events;

UPDATE features
SET name = 'Sub-events', description = 'Number of sub-events inside the event'
WHERE key = 'sub_events';
