package subscriptions

const (
    // A subscription due within 7 days is "due".
    subscriptionJSON = `
        jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'vendor', s.vendor,
            'amount', s.amount,
            'currency', s.currency,
            'interval_months', s.interval_months,
            'next_due_on', to_char(s.next_due_on, 'YYYY-MM-DD'),
            'status', CASE
                WHEN NOT s.is_active THEN 'inactive'
                WHEN s.next_due_on < CURRENT_DATE THEN 'overdue'
                WHEN s.next_due_on <= CURRENT_DATE + 7 THEN 'due'
                ELSE 'upcoming'
            END,
            'category', (SELECT jsonb_build_object('id', tc.id, 'name', tc.name) FROM transaction_categories tc WHERE tc.id = s.category_id),
            'is_active', s.is_active,
            'notes', s.notes,
            'last_renewed_on', (SELECT to_char(max(t.occurred_on), 'YYYY-MM-DD') FROM transactions t WHERE t.subscription_id = s.id),
            'total_spent', (SELECT COALESCE(sum(t.amount), 0) FROM transactions t WHERE t.subscription_id = s.id),
            'created_at', s.created_at
        )`

    ListSubscriptionsQuery = `
        SELECT COALESCE(jsonb_agg(` + subscriptionJSON + ` ORDER BY s.is_active DESC, s.next_due_on, s.name), '[]'::jsonb)
        FROM business_subscriptions s;
    `

    GetSubscriptionQuery = `
        SELECT ` + subscriptionJSON + ` FROM business_subscriptions s WHERE s.id = $1::uuid;
    `

    CreateSubscriptionQuery = `
        INSERT INTO business_subscriptions (name, vendor, amount, interval_months, next_due_on, category_id, is_active, notes)
        VALUES ($1, $2, $3, $4, $5::date, $6::uuid, $7, $8)
        RETURNING id::text;
    `

    UpdateSubscriptionQuery = `
        UPDATE business_subscriptions
        SET name = $2, vendor = $3, amount = $4, interval_months = $5, next_due_on = $6::date,
            category_id = $7::uuid, is_active = $8, notes = $9, updated_at = now()
        WHERE id = $1::uuid
        RETURNING id::text;
    `

    // Renewal expenses stay in the ledger, unlinked from the subscription.
    DeleteSubscriptionQuery = `DELETE FROM business_subscriptions WHERE id = $1::uuid;`

    // RenewSubscriptionQuery records the expense ($2 amount, NULL = the
    // subscription's amount; $3 paid on) and moves the due date one interval.
    RenewSubscriptionQuery = `
        WITH s AS (
            UPDATE business_subscriptions
            SET next_due_on = (next_due_on + make_interval(months => interval_months))::date, updated_at = now()
            WHERE id = $1::uuid AND is_active
            RETURNING *
        )
        INSERT INTO transactions (kind, source, amount, currency, description, occurred_on, category_id, subscription_id)
        SELECT 'expense', 'subscription', COALESCE($2::bigint, s.amount), s.currency,
               s.name || CASE WHEN s.vendor <> '' THEN ' (' || s.vendor || ')' ELSE '' END,
               $3::date, s.category_id, s.id
        FROM s
        RETURNING subscription_id::text;
    `

    GetCategoryKindQuery = `SELECT kind FROM transaction_categories WHERE id::text = $1;`
)
