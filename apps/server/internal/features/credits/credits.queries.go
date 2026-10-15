package credits

const (
    // creditJSON renders one credit row `c` with its event and features.
    creditJSON = `
        jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'kind', c.kind,
            'status', CASE WHEN c.ends_at <= now() THEN 'expired' ELSE 'active' END,
            'currency', c.currency,
            'subtotal', c.subtotal,
            'tax', c.tax,
            'total', c.total,
            'starts_at', c.starts_at,
            'ends_at', c.ends_at,
            'created_at', c.created_at,
            'event', (
                SELECT jsonb_build_object('id', e.id, 'name', em.name)
                FROM events e JOIN event_metadata em ON em.id = e.id
                WHERE e.credit_id = c.id
            ),
            'features', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'key', f.key, 'name', f.name, 'unit', f.unit,
                    'value', cf.value, 'label', cf.label, 'amount', cf.amount
                ) ORDER BY f.sort_order)
                FROM credit_features cf JOIN features f ON f.id = cf.feature_id
                WHERE cf.credit_id = c.id
            ), '[]'::jsonb)
        )`

    ListCreditsQuery = `
        SELECT COALESCE(jsonb_agg(` + creditJSON + ` ORDER BY c.created_at DESC), '[]'::jsonb)
        FROM credits c
        WHERE c.organization_id = $1::uuid;
    `

    RenameCreditQuery = `
        UPDATE credits c SET name = $2, updated_at = now()
        WHERE c.id = $1::uuid
        RETURNING ` + creditJSON + `;
    `

    // ClaimTrialQuery records the trial choice once and creates the trial
    // credit from each feature's trial value. $2 is the duration feature key.
    ClaimTrialQuery = `
        WITH org AS (
            UPDATE organizations SET trial_choice = 'claimed', updated_at = now()
            WHERE id = $1::uuid AND trial_choice IS NULL
            RETURNING id
        ),
        c AS (
            INSERT INTO credits (organization_id, name, kind, starts_at, ends_at)
            SELECT org.id, 'Free trial', 'trial', now(),
                   now() + make_interval(days => (SELECT trial_value FROM features WHERE key = $2))
            FROM org
            RETURNING *
        ),
        cf AS (
            INSERT INTO credit_features (credit_id, feature_id, value, label, amount)
            SELECT c.id, f.id, f.trial_value,
                   COALESCE(o.label, trim(f.trial_value::text || ' ' || f.unit)), 0
            FROM c CROSS JOIN features f
            LEFT JOIN feature_options o ON o.feature_id = f.id AND o.value = f.trial_value
            WHERE f.is_active
        )
        SELECT c.id::text FROM c;
    `

    SkipTrialQuery = `
        UPDATE organizations SET trial_choice = 'skipped', updated_at = now()
        WHERE id = $1::uuid AND trial_choice IS NULL;
    `

    InsertPaymentQuery = `
        INSERT INTO payments (organization_id, credit_name, quote, amount, currency, razorpay_order_id)
        VALUES ($1::uuid, $2, $3::jsonb, $4, $5, $6);
    `

    // FulfillPaymentQuery marks an order paid and creates its credit from
    // the stored quote, once. $3 is a pre-generated credit id, $4 the
    // duration feature key. Returns no row if the order was already paid.
    FulfillPaymentQuery = `
        WITH p AS (
            UPDATE payments
            SET status = 'paid', razorpay_payment_id = $2, credit_id = $3::uuid,
                paid_at = now(), updated_at = now()
            WHERE razorpay_order_id = $1 AND status = 'created'
            RETURNING *
        ),
        c AS (
            INSERT INTO credits (id, organization_id, name, kind, currency, subtotal, tax, total, starts_at, ends_at)
            SELECT $3::uuid, p.organization_id, p.credit_name, 'paid', p.currency,
                   (p.quote->>'subtotal')::bigint, (p.quote->>'tax')::bigint, p.amount,
                   now(),
                   now() + make_interval(days => (
                       SELECT (l->>'value')::int FROM jsonb_array_elements(p.quote->'lines') l
                       WHERE l->>'key' = $4
                   ))
            FROM p
            RETURNING id
        ),
        cf AS (
            INSERT INTO credit_features (credit_id, feature_id, value, label, amount)
            SELECT c.id, (l->>'feature_id')::uuid, (l->>'value')::int, l->>'label', (l->>'amount')::bigint
            FROM c, p, jsonb_array_elements(p.quote->'lines') l
        )
        SELECT c.id::text FROM c;
    `

    // GetPaymentCreditQuery returns the credit of an order owned by an org.
    GetPaymentCreditQuery = `
        SELECT COALESCE(credit_id::text, '') FROM payments
        WHERE razorpay_order_id = $1 AND organization_id = $2::uuid;
    `
)
