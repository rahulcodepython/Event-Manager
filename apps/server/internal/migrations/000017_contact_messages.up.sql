-- Messages from the landing page's contact form. Each is emailed to
-- CONTACT_EMAIL through the email queue.
CREATE TABLE contact_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    message     TEXT NOT NULL,
    ip          TEXT NOT NULL DEFAULT '',
    emailed_at  TIMESTAMPTZ NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_messages_created ON contact_messages (created_at DESC);
