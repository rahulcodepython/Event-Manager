package applyflow

const (
    formQuery = `SELECT event_id::text FROM event_forms WHERE id::text = $1;`

    // upsertDraftQuery creates the applicant's draft on first sign-in and
    // refreshes the Google name/picture afterwards.
    upsertDraftQuery = `
        INSERT INTO application_drafts (event_form_id, event_id, google_sub, email, name, picture_url)
        VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
        ON CONFLICT (event_form_id, google_sub) DO UPDATE
        SET email = EXCLUDED.email, name = EXCLUDED.name, picture_url = EXCLUDED.picture_url, updated_at = now();
    `

    draftQuery = `
        SELECT jsonb_build_object(
            'id', d.id, 'answers', d.answers, 'sub_event_ids', to_jsonb(d.sub_event_ids),
            'current_step', d.current_step, 'status', d.status, 'updated_at', d.updated_at,
            'hold_until', d.hold_until, 'order_id', d.razorpay_order_id
        )
        FROM application_drafts d
        WHERE d.event_form_id::text = $1 AND d.google_sub = $2;
    `

    // registrationQuery finds the applicant registered with this email,
    // whether through a draft or before (dashboard, earlier form).
    registrationQuery = `
        SELECT jsonb_build_object(
            'user_id', ea.user_id,
            'status', 'registered',
            'card_status', ea.card_status,
            'created_at', ea.created_at,
            'sub_events', COALESCE((
                SELECT jsonb_agg(se.name ORDER BY se.created_at)
                FROM sub_event_applicants sea JOIN sub_events se ON se.id = sea.sub_event_id
                WHERE sea.event_id = ea.event_id AND sea.applicant_id = ea.user_id
            ), '[]'::jsonb)
        )
        FROM event_forms ef
        JOIN event_applicants ea ON ea.event_id = ef.event_id
        WHERE ef.id::text = $1 AND lower(ea.email) = lower($2);
    `

    // refundedQuery returns the latest refund's reason, or no row.
    refundedQuery = `
        SELECT COALESCE(refund_reason, '') FROM application_drafts
        WHERE event_form_id::text = $1 AND google_sub = $2 AND status = 'refunded'
        ORDER BY refunded_at DESC NULLS LAST LIMIT 1;
    `

    saveDraftQuery = `
        UPDATE application_drafts
        SET answers = $3::jsonb, sub_event_ids = $4, current_step = $5, updated_at = now()
        WHERE event_form_id::text = $1 AND google_sub = $2 AND status = 'draft';
    `

    confirmDraftQuery = `
        UPDATE application_drafts
        SET status = 'confirmed', applicant_id = $3, confirmed_at = now(), updated_at = now()
        WHERE event_form_id::text = $1 AND google_sub = $2 AND status IN ('draft', 'awaiting_payment');
    `

    organizerDraftsQuery = `
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', d.id, 'email', d.email, 'name', d.name, 'status', d.status, 'current_step', d.current_step,
            'amount', d.amount, 'hold_until', d.hold_until, 'refunded_at', d.refunded_at,
            'refund_reason', d.refund_reason, 'updated_at', d.updated_at
        ) ORDER BY d.updated_at DESC), '[]'::jsonb)
        FROM application_drafts d
        WHERE d.event_id = $1::uuid AND d.status <> 'confirmed';
    `

    // sweepQuery deletes unfinished drafts that are too old or whose form
    // closed. $1 = max age in seconds.
    sweepQuery = `
        DELETE FROM application_drafts d
        USING event_forms ef
        WHERE ef.id = d.event_form_id
          AND d.status = 'draft'
          AND (d.updated_at < now() - make_interval(secs => $1) OR ef.expires_at <= now());
    `
)
