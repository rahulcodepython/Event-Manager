-- Coupons: percent (optionally capped) or flat discounts on a credit's
-- subtotal; GST is charged on the discounted subtotal. A use counts when
-- the purchase is paid (or completed free); refunds do not give it back.

CREATE TABLE coupons (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                 TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_-]{3,32}$'),
    description          TEXT NOT NULL DEFAULT '',
    kind                 TEXT NOT NULL CHECK (kind IN ('percent', 'flat')),
    percent_bp           INT NULL CHECK (percent_bp BETWEEN 1 AND 10000), -- 2000 = 20%
    amount               BIGINT NULL CHECK (amount > 0),                -- paise, flat
    max_discount         BIGINT NULL CHECK (max_discount > 0),          -- cap for percent
    min_subtotal         BIGINT NOT NULL DEFAULT 0 CHECK (min_subtotal >= 0),
    starts_at            TIMESTAMPTZ NULL,
    ends_at              TIMESTAMPTZ NULL,
    max_uses             INT NULL CHECK (max_uses >= 1),
    max_uses_per_client  INT NULL CHECK (max_uses_per_client >= 1),
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_coupon_value CHECK (
        (kind = 'percent' AND percent_bp IS NOT NULL AND amount IS NULL)
        OR (kind = 'flat' AND amount IS NOT NULL AND percent_bp IS NULL AND max_discount IS NULL)
    ),
    CONSTRAINT chk_coupon_window CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);

-- A purchase records its coupon and discount. A purchase whose total is 0
-- never reaches Razorpay: it has no order id and is paid on creation.
ALTER TABLE payments ADD COLUMN coupon_id UUID NULL REFERENCES coupons (id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN coupon_code TEXT NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN discount BIGINT NOT NULL DEFAULT 0 CHECK (discount >= 0);
ALTER TABLE payments ALTER COLUMN razorpay_order_id DROP NOT NULL;
ALTER TABLE payments DROP CONSTRAINT payments_amount_check;
ALTER TABLE payments ADD CONSTRAINT payments_amount_check CHECK (amount >= 0);
ALTER TABLE payments ADD CONSTRAINT chk_payments_free CHECK (amount > 0 OR razorpay_order_id IS NULL);

CREATE INDEX idx_payments_coupon ON payments (coupon_id, organization_id) WHERE coupon_id IS NOT NULL;

ALTER TABLE credits ADD COLUMN discount BIGINT NOT NULL DEFAULT 0 CHECK (discount >= 0);
