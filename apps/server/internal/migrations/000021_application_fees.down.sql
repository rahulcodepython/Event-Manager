DROP INDEX IF EXISTS idx_drafts_holds;
ALTER TABLE application_drafts
    DROP COLUMN IF EXISTS refund_reason, DROP COLUMN IF EXISTS refunded_at, DROP COLUMN IF EXISTS refund_id,
    DROP COLUMN IF EXISTS transfer_id, DROP COLUMN IF EXISTS platform_fee, DROP COLUMN IF EXISTS gateway_fee,
    DROP COLUMN IF EXISTS paid_at, DROP COLUMN IF EXISTS hold_until, DROP COLUMN IF EXISTS razorpay_payment_id,
    DROP COLUMN IF EXISTS razorpay_order_id, DROP COLUMN IF EXISTS amount;
DROP TABLE IF EXISTS payout_accounts;
ALTER TABLE event_forms DROP COLUMN IF EXISTS fee;
