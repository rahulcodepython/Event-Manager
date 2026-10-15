CREATE TABLE IF NOT EXISTS event_attendance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    event_date_id   UUID NOT NULL REFERENCES event_dates (id) ON DELETE CASCADE,
    applicant_id    TEXT NOT NULL REFERENCES applicants (id) ON DELETE CASCADE,
    device_id       UUID NULL REFERENCES devices (id) ON DELETE SET NULL,
    entered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    exited_at       TIMESTAMPTZ NULL DEFAULT NULL,
    is_early        BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_event_date_applicant UNIQUE (event_date_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendance_event_id ON event_attendance (event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event_date_id ON event_attendance (event_date_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_applicant_id ON event_attendance (applicant_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_device_id ON event_attendance (device_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_entered_at ON event_attendance (entered_at);
