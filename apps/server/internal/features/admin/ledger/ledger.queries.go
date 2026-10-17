package ledger

const (
    ListCategoriesQuery = `
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', tc.id, 'name', tc.name, 'kind', tc.kind, 'created_at', tc.created_at,
            'in_use', (SELECT count(*) FROM transactions t WHERE t.category_id = tc.id)
                    + (SELECT count(*) FROM business_subscriptions s WHERE s.category_id = tc.id)
        ) ORDER BY tc.kind, lower(tc.name)), '[]'::jsonb)
        FROM transaction_categories tc;
    `

    categoryJSON = `jsonb_build_object('id', id, 'name', name, 'kind', kind, 'created_at', created_at, 'in_use', 0)`

    CreateCategoryQuery = `
        INSERT INTO transaction_categories (name, kind) VALUES ($1, $2)
        RETURNING ` + categoryJSON + `;
    `

    UpdateCategoryQuery = `
        UPDATE transaction_categories SET name = $2, updated_at = now()
        WHERE id = $1::uuid
        RETURNING ` + categoryJSON + `;
    `

    DeleteCategoryQuery = `DELETE FROM transaction_categories WHERE id = $1::uuid;`

    GetCategoryKindQuery = `SELECT kind FROM transaction_categories WHERE id::text = $1;`

    transactionJSON = `
        jsonb_build_object(
            'id', t.id,
            'kind', t.kind,
            'source', t.source,
            'amount', t.amount,
            'currency', t.currency,
            'description', t.description,
            'occurred_on', to_char(t.occurred_on, 'YYYY-MM-DD'),
            'category', (SELECT jsonb_build_object('id', tc.id, 'name', tc.name) FROM transaction_categories tc WHERE tc.id = t.category_id),
            'organization', (SELECT jsonb_build_object('id', o.id, 'name', o.name) FROM organizations o WHERE o.id = t.organization_id),
            'subscription', (SELECT jsonb_build_object('id', s.id, 'name', s.name) FROM business_subscriptions s WHERE s.id = t.subscription_id),
            'payment_id', t.payment_id,
            'created_at', t.created_at
        )`

    // ListTransactionsQuery filters with optional params ('' = any):
    // $1 kind, $2 source, $3 category id, $4 from, $5 to, $6 search,
    // $7 limit, $8 offset. Totals cover every matching row, not the page.
    ListTransactionsQuery = `
        WITH filtered AS (
            SELECT t.* FROM transactions t
            WHERE ($1 = '' OR t.kind = $1)
              AND ($2 = '' OR t.source = $2)
              AND ($3 = '' OR t.category_id::text = $3)
              AND ($4 = '' OR t.occurred_on >= $4::date)
              AND ($5 = '' OR t.occurred_on <= $5::date)
              AND ($6 = '' OR t.description ILIKE '%' || $6 || '%')
        ),
        page AS (
            SELECT * FROM filtered
            ORDER BY occurred_on DESC, created_at DESC
            LIMIT $7 OFFSET $8
        )
        SELECT jsonb_build_object(
            'data', COALESCE((SELECT jsonb_agg(` + transactionJSON + ` ORDER BY t.occurred_on DESC, t.created_at DESC) FROM page t), '[]'::jsonb),
            'total', (SELECT count(*) FROM filtered),
            'totals', (
                SELECT jsonb_build_object(
                    'income', COALESCE(sum(amount) FILTER (WHERE kind = 'income'), 0),
                    'expense', COALESCE(sum(amount) FILTER (WHERE kind = 'expense'), 0),
                    'refund', COALESCE(sum(amount) FILTER (WHERE kind = 'refund'), 0),
                    'net', COALESCE(sum(CASE WHEN kind = 'income' THEN amount ELSE -amount END), 0)
                )
                FROM filtered
            )
        );
    `

    CreateTransactionQuery = `
        WITH t AS (
            INSERT INTO transactions (kind, source, amount, description, occurred_on, category_id)
            VALUES ($1, 'manual', $2, $3, $4::date, $5::uuid)
            RETURNING *
        )
        SELECT ` + transactionJSON + ` FROM t;
    `

    // Only manual entries can be edited.
    UpdateTransactionQuery = `
        WITH t AS (
            UPDATE transactions
            SET kind = $2, amount = $3, description = $4, occurred_on = $5::date, category_id = $6::uuid, updated_at = now()
            WHERE id = $1::uuid AND source = 'manual'
            RETURNING *
        )
        SELECT ` + transactionJSON + ` FROM t;
    `

    // Payment and application-fee rows mirror Razorpay and cannot be
    // deleted; manual entries and subscription renewals can.
    DeleteTransactionQuery = `
        DELETE FROM transactions WHERE id = $1::uuid AND source NOT IN ('payment', 'application_fee');
    `
)
