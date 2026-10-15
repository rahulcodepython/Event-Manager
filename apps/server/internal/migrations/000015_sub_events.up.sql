-- Sub-events: smaller events inside an event (workshops, competitions...)
-- with their own days and hours. Applicants are the event's applicants,
-- linked through sub_event_applicants. Attendance reuses event_dates and
-- event_attendance: a sub-event's days are event_dates rows with sub_event_id.

UPDATE features
SET name = 'Number of sub-events', description = 'How many sub-events the event can have'
WHERE key = 'sub_events';

CREATE TABLE sub_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    venue         TEXT NOT NULL DEFAULT '',
    -- NULL: no cap. A hard cap for every way of joining.
    capacity      INT NULL CHECK (capacity IS NULL OR capacity >= 1),
    -- Public link: the event form with this sub-event fixed.
    link_enabled  BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Lets sub_event_applicants check the sub-event's event.
    CONSTRAINT uq_sub_events_event UNIQUE (id, event_id)
);

CREATE INDEX idx_sub_events_event ON sub_events (event_id, created_at);

-- An applicant can be in a sub-event only if registered for its event.
CREATE UNIQUE INDEX uq_event_applicants_event_user ON event_applicants (event_id, user_id);

CREATE TABLE sub_event_applicants (
    sub_event_id  UUID NOT NULL,
    event_id      UUID NOT NULL,
    applicant_id  TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (sub_event_id, applicant_id),
    FOREIGN KEY (sub_event_id, event_id) REFERENCES sub_events (id, event_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id, applicant_id) REFERENCES event_applicants (event_id, user_id) ON DELETE CASCADE
);

CREATE INDEX idx_sub_event_applicants_applicant ON sub_event_applicants (event_id, applicant_id);

-- Days of the event (sub_event_id NULL) or of one sub-event.
ALTER TABLE event_dates ADD COLUMN sub_event_id UUID NULL REFERENCES sub_events (id) ON DELETE CASCADE;
ALTER TABLE event_dates DROP CONSTRAINT uq_event_date;
CREATE UNIQUE INDEX uq_event_dates_scope ON event_dates (event_id, (COALESCE(sub_event_id, '00000000-0000-0000-0000-000000000000'::uuid)), date);
CREATE INDEX idx_event_dates_sub_event ON event_dates (sub_event_id, date) WHERE sub_event_id IS NOT NULL;

-- Self-enrollment on the public form: off, exactly one, or any number.
ALTER TABLE event_forms ADD COLUMN sub_event_mode TEXT NOT NULL DEFAULT 'off' CHECK (sub_event_mode IN ('off', 'one', 'many'));
ALTER TABLE event_forms ADD COLUMN sub_event_required BOOLEAN NOT NULL DEFAULT false;
