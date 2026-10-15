CREATE TABLE event_dates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    start_time  TIME WITHOUT TIME ZONE NOT NULL,
    end_time    TIME WITHOUT TIME ZONE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_event_date UNIQUE (event_id, date),
    CONSTRAINT chk_time_order CHECK (end_time >= start_time)
);

CREATE INDEX idx_event_dates_lookup ON event_dates (event_id, date);
