-- ID cards: the card publishing schedule, per-applicant delivery state and
-- the client reminder log.

-- expires_at closes the application window. Cards go out at
-- cards_publish_at (never before the window closes); cards_published_at is
-- set once they have been queued, after which dates and applicants are frozen.
ALTER TABLE event_forms ADD COLUMN cards_publish_at TIMESTAMPTZ NULL;
UPDATE event_forms SET cards_publish_at = expires_at;
ALTER TABLE event_forms ALTER COLUMN cards_publish_at SET NOT NULL;
ALTER TABLE event_forms ADD COLUMN cards_published_at TIMESTAMPTZ NULL;
ALTER TABLE event_forms ADD CONSTRAINT chk_event_forms_cards_after_close CHECK (cards_publish_at >= expires_at);

CREATE INDEX idx_event_forms_cards_due ON event_forms (cards_publish_at) WHERE cards_published_at IS NULL;

-- Card email delivery per applicant of an event.
--   pending: not published yet; queued: waiting in the email queue;
--   sent: delivered to Resend; failed: gave up (see card_error).
ALTER TABLE event_applicants ADD COLUMN card_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (card_status IN ('pending', 'queued', 'sent', 'failed'));
ALTER TABLE event_applicants ADD COLUMN card_queued_at TIMESTAMPTZ NULL;
ALTER TABLE event_applicants ADD COLUMN card_sent_at TIMESTAMPTZ NULL;
ALTER TABLE event_applicants ADD COLUMN card_error TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_event_applicants_card_queued ON event_applicants (card_queued_at) WHERE card_status = 'queued';

-- One row per reminder email sent to a client, so each goes out once.
CREATE TABLE credit_reminders (
    credit_id  UUID NOT NULL REFERENCES credits (id) ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK (kind IN ('credit_end_1d', 'prune_7d', 'prune_1d')),
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (credit_id, kind)
);
