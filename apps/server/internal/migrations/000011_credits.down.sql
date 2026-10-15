DROP INDEX IF EXISTS uq_events_credit;
ALTER TABLE events DROP COLUMN IF EXISTS credit_id;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS credit_features;
DROP TABLE IF EXISTS credits;
ALTER TABLE organizations DROP COLUMN IF EXISTS trial_choice;
ALTER TABLE pricing_settings DROP COLUMN IF EXISTS trial_max_event_days;
ALTER TABLE features DROP COLUMN IF EXISTS trial_value;
