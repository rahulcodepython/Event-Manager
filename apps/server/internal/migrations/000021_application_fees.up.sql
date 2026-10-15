-- Application fees, paid by applicants through Razorpay and transferred to
-- the organizer's Razorpay Route linked account.

-- One fee per form, in paise; 0 = free.
ALTER TABLE event_forms ADD COLUMN fee BIGINT NOT NULL DEFAULT 0 CHECK (fee >= 0);

-- The organizer's Route linked account. Bank details go to Razorpay only;
-- we keep the masked account number for display.
CREATE TABLE payout_accounts (
    organization_id    UUID PRIMARY KEY REFERENCES organizations (id) ON DELETE CASCADE,
    razorpay_account_id TEXT NOT NULL UNIQUE,
    product_id         TEXT NOT NULL DEFAULT '',
    -- Razorpay's activation status: created, under_review, needs_clarification,
    -- activated, suspended, rejected...
    status             TEXT NOT NULL DEFAULT 'created',
    legal_business_name TEXT NOT NULL,
    contact_name       TEXT NOT NULL,
    email              TEXT NOT NULL,
    phone              TEXT NOT NULL,
    bank_account_last4 TEXT NOT NULL DEFAULT '',
    ifsc               TEXT NOT NULL DEFAULT '',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment state of a draft on a form with a fee.
ALTER TABLE application_drafts ADD COLUMN amount BIGINT NOT NULL DEFAULT 0;
ALTER TABLE application_drafts ADD COLUMN razorpay_order_id TEXT NULL UNIQUE;
ALTER TABLE application_drafts ADD COLUMN razorpay_payment_id TEXT NULL UNIQUE;
-- While awaiting payment the draft holds a seat until hold_until.
ALTER TABLE application_drafts ADD COLUMN hold_until TIMESTAMPTZ NULL;
ALTER TABLE application_drafts ADD COLUMN paid_at TIMESTAMPTZ NULL;
ALTER TABLE application_drafts ADD COLUMN gateway_fee BIGINT NOT NULL DEFAULT 0;   -- Razorpay fee incl. tax
ALTER TABLE application_drafts ADD COLUMN platform_fee BIGINT NOT NULL DEFAULT 0;
ALTER TABLE application_drafts ADD COLUMN transfer_id TEXT NULL;
ALTER TABLE application_drafts ADD COLUMN refund_id TEXT NULL;
ALTER TABLE application_drafts ADD COLUMN refunded_at TIMESTAMPTZ NULL;
ALTER TABLE application_drafts ADD COLUMN refund_reason TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_drafts_holds ON application_drafts (event_id, hold_until) WHERE status = 'awaiting_payment';
