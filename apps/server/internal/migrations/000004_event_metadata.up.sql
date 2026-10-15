CREATE TABLE event_metadata (
    id              UUID PRIMARY KEY REFERENCES events (id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    venue           TEXT,
    logo            TEXT DEFAULT NULL,
    organizer       TEXT DEFAULT NULL
);

CREATE INDEX event_metadata_name_idx ON event_metadata (name);
