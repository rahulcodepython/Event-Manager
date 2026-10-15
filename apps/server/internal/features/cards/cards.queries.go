package cards

const (
    GetStatusQuery = `
        SELECT jsonb_build_object(
            'has_form', ef.id IS NOT NULL,
            'closes_at', ef.expires_at,
            'publish_at', ef.cards_publish_at,
            'published_at', ef.cards_published_at,
            'is_closed', COALESCE(ef.expires_at <= now(), false),
            'counts', (
                SELECT jsonb_build_object(
                    'pending', count(*) FILTER (WHERE card_status = 'pending'),
                    'queued', count(*) FILTER (WHERE card_status = 'queued'),
                    'sent', count(*) FILTER (WHERE card_status = 'sent'),
                    'failed', count(*) FILTER (WHERE card_status = 'failed')
                )
                FROM event_applicants WHERE event_id = e.id
            )
        )
        FROM events e
        LEFT JOIN event_forms ef ON ef.event_id = e.id
        WHERE e.id = $1::uuid;
    `

    // FormStateQuery: whether the event has a form, whether cards went out
    // and whether the window is closed.
    FormStateQuery = `
        SELECT cards_published_at IS NOT NULL, expires_at <= now()
        FROM event_forms WHERE event_id = $1::uuid;
    `

    // Rescheduling also reopens a closed window, until cards are published.
    UpdateScheduleQuery = `
        UPDATE event_forms
        SET expires_at = $2, cards_publish_at = $3, updated_at = now()
        WHERE event_id = $1::uuid AND cards_published_at IS NULL;
    `

    CloseNowQuery = `
        UPDATE event_forms
        SET expires_at = now(), updated_at = now()
        WHERE event_id = $1::uuid AND cards_published_at IS NULL AND expires_at > now();
    `

    PublishNowQuery = `
        UPDATE event_forms
        SET cards_publish_at = LEAST(cards_publish_at, now()), updated_at = now()
        WHERE event_id = $1::uuid AND cards_published_at IS NULL AND expires_at <= now();
    `

    // PublishDueQuery marks due events published and queues their cards.
    // $1 limits it to one event ('' = all). Events whose credit ended or
    // whose organization is suspended are skipped.
    PublishDueQuery = `
        WITH due AS (
            UPDATE event_forms ef
            SET cards_published_at = now(), updated_at = now()
            FROM events e
            JOIN credit_entitlements ce ON ce.credit_id = e.credit_id
            WHERE e.id = ef.event_id
              AND ($1 = '' OR ef.event_id::text = $1)
              AND ef.cards_published_at IS NULL
              AND ef.cards_publish_at <= now()
              AND ef.expires_at <= now()
              AND NOT ce.is_expired
              AND NOT ce.is_suspended
            RETURNING ef.event_id
        )
        UPDATE event_applicants ea
        SET card_status = 'queued', card_queued_at = now(), card_error = ''
        FROM due
        WHERE ea.event_id = due.event_id AND ea.card_status = 'pending'
        RETURNING ea.id::text;
    `

    // ResendQuery requeues cards of a published event. $2 scope: 'failed',
    // 'all', or 'applicant' with $3 the applicant (user) id.
    ResendQuery = `
        UPDATE event_applicants ea
        SET card_status = 'queued', card_queued_at = now(), card_error = ''
        FROM event_forms ef
        WHERE ef.event_id = ea.event_id
          AND ea.event_id = $1::uuid
          AND ef.cards_published_at IS NOT NULL
          AND ea.card_status <> 'queued'
          AND (
              ($2 = 'failed' AND ea.card_status = 'failed')
              OR $2 = 'all'
              OR ($2 = 'applicant' AND ea.user_id = $3)
          )
        RETURNING ea.id::text;
    `

    // StaleQueuedQuery re-queues cards stuck in 'queued' (e.g. the API
    // stopped between the database update and the enqueue). $1 = minutes.
    StaleQueuedQuery = `
        UPDATE event_applicants
        SET card_queued_at = now()
        WHERE card_status = 'queued' AND card_queued_at < now() - make_interval(mins => $1)
        RETURNING id::text;
    `

    cardDataSelect = `
        SELECT jsonb_build_object(
            'event_applicant_id', ea.id,
            'event_id', e.id,
            'applicant_id', a.id,
            'name', a.name,
            'email', ea.email,
            'card_status', ea.card_status,
            'event_name', COALESCE(em.name, ''),
            'start_date', to_char(e.start_date, 'YYYY-MM-DD'),
            'end_date', to_char(e.end_date, 'YYYY-MM-DD'),
            'venue', COALESCE(em.venue, ''),
            'organizer', COALESCE(em.organizer, ''),
            'logo', COALESCE(em.logo, ''),
            'branding', ce.has_branding,
            'sub_events', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'name', se.name,
                    'first_day', (SELECT to_char(min(ed.date), 'YYYY-MM-DD') FROM event_dates ed WHERE ed.sub_event_id = se.id),
                    'last_day', (SELECT to_char(max(ed.date), 'YYYY-MM-DD') FROM event_dates ed WHERE ed.sub_event_id = se.id)
                ) ORDER BY se.created_at)
                FROM sub_event_applicants sea
                JOIN sub_events se ON se.id = sea.sub_event_id
                WHERE sea.event_id = ea.event_id AND sea.applicant_id = ea.user_id
            ), '[]'::jsonb)
        )
        FROM event_applicants ea
        JOIN applicants a ON a.id = ea.user_id
        JOIN events e ON e.id = ea.event_id
        LEFT JOIN event_metadata em ON em.id = e.id
        JOIN credit_entitlements ce ON ce.credit_id = e.credit_id
    `

    CardByJobQuery = cardDataSelect + `WHERE ea.id = $1::uuid;`

    CardByApplicantQuery = cardDataSelect + `WHERE ea.event_id = $1::uuid AND ea.user_id = $2;`

    MarkSentQuery = `
        UPDATE event_applicants
        SET card_status = 'sent', card_sent_at = now(), card_error = ''
        WHERE id = $1::uuid AND card_status = 'queued';
    `

    MarkFailedQuery = `
        UPDATE event_applicants
        SET card_status = 'failed', card_error = $2
        WHERE id = $1::uuid AND card_status = 'queued';
    `

    // MarkRetryQuery keeps the card queued, refreshing card_queued_at so the
    // stale sweep leaves it to the queue's own retry.
    MarkRetryQuery = `
        UPDATE event_applicants
        SET card_error = $2, card_queued_at = now()
        WHERE id = $1::uuid AND card_status = 'queued';
    `
)
