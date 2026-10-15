ALTER TABLE credits DROP COLUMN IF EXISTS discount;

DROP INDEX IF EXISTS idx_payments_coupon;
DELETE FROM payments WHERE razorpay_order_id IS NULL;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_free;
ALTER TABLE payments DROP CONSTRAINT payments_amount_check;
ALTER TABLE payments ADD CONSTRAINT payments_amount_check CHECK (amount > 0);
ALTER TABLE payments ALTER COLUMN razorpay_order_id SET NOT NULL;
ALTER TABLE payments DROP COLUMN IF EXISTS discount;
ALTER TABLE payments DROP COLUMN IF EXISTS coupon_code;
ALTER TABLE payments DROP COLUMN IF EXISTS coupon_id;

DROP TABLE IF EXISTS coupons;
