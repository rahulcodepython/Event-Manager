DELETE FROM transactions WHERE source = 'application_fee';
DROP INDEX IF EXISTS uq_transactions_draft;
ALTER TABLE transactions DROP COLUMN IF EXISTS draft_id;
ALTER TABLE transactions DROP CONSTRAINT chk_transaction_source;
ALTER TABLE transactions DROP CONSTRAINT transactions_source_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_source_check CHECK (source IN ('payment', 'manual', 'subscription'));
ALTER TABLE transactions ADD CONSTRAINT chk_transaction_source CHECK (
    (source = 'payment' AND kind IN ('income', 'refund'))
    OR (source = 'manual' AND kind IN ('income', 'expense'))
    OR (source = 'subscription' AND kind = 'expense')
);
