package dashboard

const (
    // moneyJSON sums the ledger rows `t` of a period.
    moneyJSON = `
        jsonb_build_object(
            'income', COALESCE(sum(t.amount) FILTER (WHERE t.kind = 'income'), 0),
            'refunds', COALESCE(sum(t.amount) FILTER (WHERE t.kind = 'refund'), 0),
            'expenses', COALESCE(sum(t.amount) FILTER (WHERE t.kind = 'expense'), 0),
            'revenue', COALESCE(sum(t.amount) FILTER (WHERE t.kind = 'income'), 0)
                     - COALESCE(sum(t.amount) FILTER (WHERE t.kind = 'refund'), 0),
            'profit', COALESCE(sum(CASE WHEN t.kind = 'income' THEN t.amount ELSE -t.amount END), 0)
        )`

    // GetDashboardQuery: $1 = number of months in the monthly series.
    GetDashboardQuery = `
        SELECT jsonb_build_object(
            'currency', (SELECT currency FROM pricing_settings WHERE id = 1),
            'all_time', (SELECT ` + moneyJSON + ` FROM transactions t),
            'this_month', (
                SELECT ` + moneyJSON + ` FROM transactions t
                WHERE t.occurred_on >= date_trunc('month', CURRENT_DATE)
            ),
            'counts', jsonb_build_object(
                'clients', (SELECT count(*) FROM organizations),
                'suspended_clients', (SELECT count(*) FROM organizations WHERE suspended_at IS NOT NULL),
                'new_clients', (SELECT count(*) FROM organizations WHERE created_at >= date_trunc('month', now())),
                'credits_sold', (SELECT count(*) FROM credits WHERE kind = 'paid'),
                'credits_granted', (SELECT count(*) FROM credits WHERE kind = 'granted'),
                'trials_claimed', (SELECT count(*) FROM credits WHERE kind = 'trial'),
                'active_events', (
                    SELECT count(*) FROM events e JOIN credits c ON c.id = e.credit_id
                    WHERE c.ends_at > now()
                )
            ),
            'monthly', (
                SELECT jsonb_agg(jsonb_build_object('month', to_char(m.month, 'YYYY-MM')) || (
                    SELECT ` + moneyJSON + ` FROM transactions t
                    WHERE t.occurred_on >= m.month AND t.occurred_on < m.month + interval '1 month'
                ) ORDER BY m.month)
                FROM generate_series(
                    date_trunc('month', CURRENT_DATE) - make_interval(months => $1 - 1),
                    date_trunc('month', CURRENT_DATE),
                    interval '1 month'
                ) AS m(month)
            ),
            'due_subscriptions', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', s.id, 'name', s.name, 'amount', s.amount,
                    'next_due_on', to_char(s.next_due_on, 'YYYY-MM-DD'),
                    'overdue', s.next_due_on < CURRENT_DATE
                ) ORDER BY s.next_due_on)
                FROM business_subscriptions s
                WHERE s.is_active AND s.next_due_on <= CURRENT_DATE + 7
            ), '[]'::jsonb),
            'recent_payments', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', p.id,
                    'organization', jsonb_build_object('id', o.id, 'name', o.name),
                    'credit_name', p.credit_name,
                    'amount', p.amount,
                    'status', p.status,
                    'paid_at', p.paid_at
                ) ORDER BY p.paid_at DESC)
                FROM (
                    SELECT * FROM payments WHERE status <> 'created'
                    ORDER BY paid_at DESC LIMIT 8
                ) p
                JOIN organizations o ON o.id = p.organization_id
            ), '[]'::jsonb)
        );
    `
)
