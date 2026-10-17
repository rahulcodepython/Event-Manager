-- The platform's share of application fees goes into the admin ledger.
ALTER TABLE transactions DROP CONSTRAINT chk_transaction_source;
ALTER TABLE transactions DROP CONSTRAINT transactions_source_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_source_check
    CHECK (source IN ('payment', 'manual', 'subscription', 'application_fee'));
ALTER TABLE transactions ADD CONSTRAINT chk_transaction_source CHECK (
    (source = 'payment' AND kind IN ('income', 'refund'))
    OR (source = 'manual' AND kind IN ('income', 'expense'))
    OR (source = 'subscription' AND kind = 'expense')
    OR (source = 'application_fee' AND kind IN ('income', 'refund'))
);
ALTER TABLE transactions ADD COLUMN draft_id UUID NULL REFERENCES application_drafts (id) ON DELETE SET NULL;
CREATE UNIQUE INDEX uq_transactions_draft ON transactions (draft_id, kind) WHERE draft_id IS NOT NULL;
