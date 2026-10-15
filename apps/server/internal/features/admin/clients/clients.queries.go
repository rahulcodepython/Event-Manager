package clients

const (
    summaryJSON = `
        jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'phone', o.phone,
            'owner', jsonb_build_object('id', u.id, 'email', u.email, 'name', u.name, 'avatar_url', u.avatar_url),
            'trial_choice', o.trial_choice,
            'suspended_at', o.suspended_at,
            'created_at', o.created_at,
            'credits', (SELECT count(*) FROM credits c WHERE c.organization_id = o.id),
            'events', (SELECT count(*) FROM events e WHERE e.organization_id = o.id),
            'revenue', (
                SELECT COALESCE(sum(CASE WHEN t.kind = 'income' THEN t.amount ELSE -t.amount END), 0)
                FROM transactions t WHERE t.organization_id = o.id AND t.source = 'payment'
            )
        )`

    // ListClientsQuery: $1 search ('' = all) over org name, owner email and
    // name; $2 status ('', 'active', 'suspended'); $3 limit, $4 offset.
    ListClientsQuery = `
        WITH filtered AS (
            SELECT o.id FROM organizations o
            JOIN users u ON u.id = o.owner_id
            WHERE ($1 = '' OR o.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR u.name ILIKE '%' || $1 || '%')
              AND ($2 = '' OR ($2 = 'suspended') = (o.suspended_at IS NOT NULL))
        )
        SELECT jsonb_build_object(
            'data', COALESCE((
                SELECT jsonb_agg(` + summaryJSON + ` ORDER BY o.created_at DESC)
                FROM (
                    SELECT o.* FROM organizations o
                    WHERE o.id IN (SELECT id FROM filtered)
                    ORDER BY o.created_at DESC
                    LIMIT $3 OFFSET $4
                ) o
                JOIN users u ON u.id = o.owner_id
            ), '[]'::jsonb),
            'total', (SELECT count(*) FROM filtered)
        );
    `

    GetClientQuery = `
        SELECT ` + summaryJSON + ` || jsonb_build_object(
            'credit_list', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', c.id,
                    'name', c.name,
                    'kind', c.kind,
                    'status', CASE
                        WHEN c.revoked_at IS NOT NULL THEN 'revoked'
                        WHEN c.ends_at <= now() THEN 'expired'
                        ELSE 'active'
                    END,
                    'currency', c.currency,
                    'total', c.total,
                    'starts_at', c.starts_at,
                    'ends_at', c.ends_at,
                    'revoked_at', c.revoked_at,
                    'created_at', c.created_at,
                    'event', (
                        SELECT jsonb_build_object('id', e.id, 'name', em.name)
                        FROM events e JOIN event_metadata em ON em.id = e.id
                        WHERE e.credit_id = c.id
                    ),
                    'features', COALESCE((
                        SELECT jsonb_agg(jsonb_build_object('key', f.key, 'name', f.name, 'value', cf.value, 'label', cf.label) ORDER BY f.sort_order)
                        FROM credit_features cf JOIN features f ON f.id = cf.feature_id
                        WHERE cf.credit_id = c.id
                    ), '[]'::jsonb)
                ) ORDER BY c.created_at DESC)
                FROM credits c WHERE c.organization_id = o.id
            ), '[]'::jsonb),
            'event_list', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', e.id,
                    'name', COALESCE(em.name, ''),
                    'start_date', to_char(e.start_date, 'YYYY-MM-DD'),
                    'end_date', to_char(e.end_date, 'YYYY-MM-DD'),
                    'applicants', (SELECT count(*) FROM event_applicants ea WHERE ea.event_id = e.id),
                    'credit', jsonb_build_object('id', c.id, 'name', c.name),
                    'created_at', e.created_at
                ) ORDER BY e.created_at DESC)
                FROM events e
                LEFT JOIN event_metadata em ON em.id = e.id
                JOIN credits c ON c.id = e.credit_id
                WHERE e.organization_id = o.id
            ), '[]'::jsonb),
            'payment_list', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', p.id,
                    'credit_name', p.credit_name,
                    'credit_id', p.credit_id,
                    'amount', p.amount,
                    'currency', p.currency,
                    'status', p.status,
                    'razorpay_order_id', p.razorpay_order_id,
                    'razorpay_payment_id', p.razorpay_payment_id,
                    'paid_at', p.paid_at,
                    'refunded_at', p.refunded_at,
                    'refund_note', p.refund_note,
                    'created_at', p.created_at
                ) ORDER BY p.created_at DESC)
                FROM payments p WHERE p.organization_id = o.id AND p.status <> 'created'
            ), '[]'::jsonb)
        )
        FROM organizations o
        JOIN users u ON u.id = o.owner_id
        WHERE o.id = $1::uuid;
    `

    ClientExistsQuery = `SELECT EXISTS (SELECT 1 FROM organizations WHERE id = $1::uuid);`

    // SetSuspendedQuery suspends ($2 = true) or restores the organization
    // and returns its owner's user id.
    SetSuspendedQuery = `
        UPDATE organizations
        SET suspended_at = CASE WHEN $2 THEN COALESCE(suspended_at, now()) ELSE NULL END, updated_at = now()
        WHERE id = $1::uuid
        RETURNING owner_id::text;
    `

    ResetTrialQuery = `
        UPDATE organizations SET trial_choice = NULL, updated_at = now() WHERE id = $1::uuid;
    `

    // GrantCreditQuery creates a free credit from a priced quote ($3), its
    // features copied with amount 0. $4 is the duration feature key.
    GrantCreditQuery = `
        WITH c AS (
            INSERT INTO credits (organization_id, name, kind, currency, starts_at, ends_at)
            SELECT $1::uuid, $2, 'granted', $3::jsonb->>'currency', now(),
                   now() + make_interval(days => (
                       SELECT (l->>'value')::int FROM jsonb_array_elements($3::jsonb->'lines') l
                       WHERE l->>'key' = $4
                   ))
            RETURNING id
        ),
        cf AS (
            INSERT INTO credit_features (credit_id, feature_id, value, label, amount)
            SELECT c.id, (l->>'feature_id')::uuid, (l->>'value')::int, l->>'label', 0
            FROM c, jsonb_array_elements($3::jsonb->'lines') l
        )
        SELECT c.id::text FROM c;
    `

    // RefundPaymentQuery marks a paid payment refunded, ends its credit now
    // (the event goes read-only and is pruned after its backup days) and
    // records the refund in the ledger. No row if not refundable.
    RefundPaymentQuery = `
        WITH p AS (
            UPDATE payments
            SET status = 'refunded', refunded_at = now(), refund_note = $2, updated_at = now()
            WHERE id = $1::uuid AND status = 'paid'
            RETURNING *
        ),
        c AS (
            UPDATE credits
            SET revoked_at = now(), ends_at = LEAST(ends_at, now()), updated_at = now()
            WHERE id = (SELECT credit_id FROM p)
            RETURNING id
        ),
        t AS (
            INSERT INTO transactions (kind, source, amount, currency, description, payment_id, organization_id)
            SELECT 'refund', 'payment', p.amount, p.currency,
                   'Refund: ' || p.credit_name || CASE WHEN $2 <> '' THEN ' (' || $2 || ')' ELSE '' END,
                   p.id, p.organization_id
            FROM p
        )
        SELECT p.organization_id::text FROM p;
    `

    PaymentStatusQuery = `SELECT status FROM payments WHERE id = $1::uuid;`
)
