-- Event dates and session hours are wall-clock times in the event's own
-- timezone (IANA name). New events get APP_TIMEZONE unless one is chosen.
-- Rows that exist already keep UTC, which is how they were evaluated so far.
ALTER TABLE events ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE events ALTER COLUMN timezone DROP DEFAULT;
