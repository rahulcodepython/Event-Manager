DROP TABLE IF EXISTS credit_reminders;

DROP INDEX IF EXISTS idx_event_applicants_card_queued;
ALTER TABLE event_applicants DROP COLUMN IF EXISTS card_error;
ALTER TABLE event_applicants DROP COLUMN IF EXISTS card_sent_at;
ALTER TABLE event_applicants DROP COLUMN IF EXISTS card_queued_at;
ALTER TABLE event_applicants DROP COLUMN IF EXISTS card_status;

DROP INDEX IF EXISTS idx_event_forms_cards_due;
ALTER TABLE event_forms DROP CONSTRAINT IF EXISTS chk_event_forms_cards_after_close;
ALTER TABLE event_forms DROP COLUMN IF EXISTS cards_published_at;
ALTER TABLE event_forms DROP COLUMN IF EXISTS cards_publish_at;
