-- An application in progress on the public form, owned by the applicant's
-- Google account. It becomes an applicant only when confirmed (submitted,
-- or paid when the form has a fee).
CREATE TABLE application_drafts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_form_id  UUID NOT NULL REFERENCES event_forms (id) ON DELETE CASCADE,
    event_id       UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    google_sub     TEXT NOT NULL,
    email          TEXT NOT NULL,
    name           TEXT NOT NULL,
    picture_url    TEXT NOT NULL DEFAULT '',
    -- Form values as entered (image fields hold upload tokens).
    answers        JSONB NOT NULL DEFAULT '{}'::jsonb,
    sub_event_ids  TEXT[] NOT NULL DEFAULT '{}',
    current_step   INT NOT NULL DEFAULT 0 CHECK (current_step >= 0),
    status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'awaiting_payment', 'confirmed', 'refunded')),
    -- Set when confirmed: the applicant (user) id created from this draft.
    applicant_id   TEXT NULL,
    confirmed_at   TIMESTAMPTZ NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_drafts_form_sub UNIQUE (event_form_id, google_sub),
    CONSTRAINT uq_drafts_form_email UNIQUE (event_form_id, email)
);

CREATE INDEX idx_drafts_open ON application_drafts (updated_at) WHERE status IN ('draft', 'awaiting_payment');
