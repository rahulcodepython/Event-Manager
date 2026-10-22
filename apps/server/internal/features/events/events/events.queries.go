package events

const (
    // ListEventsQuery retrieves paginated events conforming directly to generic.PaginatedResponse in a single CTE round-trip.
    ListEventsQuery = `
        WITH filtered_events AS (
            SELECT
                e.id,
                e.credit_id,
                em.name,
                to_char(e.start_date, 'YYYY-MM-DD') AS start_date,
                to_char(e.end_date, 'YYYY-MM-DD') AS end_date,
                em.venue,
                em.logo,
                em.organizer,
                e.timezone,
                e.created_at,
                e.updated_at
            FROM events e
            JOIN event_metadata em ON em.id = e.id
            WHERE e.organization_id = $5::uuid
              AND ($1 = '' OR em.name ILIKE '%' || $1 || '%' OR COALESCE(em.venue, '') ILIKE '%' || $1 || '%')
        ),
        total_count AS (
            SELECT count(*) AS count FROM filtered_events
        ),
        paginated_data AS (
            SELECT jsonb_build_object(
                'id', fe.id,
                'name', fe.name,
                'start_date', fe.start_date,
                'end_date', fe.end_date,
                'venue', fe.venue,
                'logo', fe.logo,
                'organizer', fe.organizer,
                'timezone', fe.timezone,
                'credit', (
                    SELECT jsonb_build_object('id', cr.id, 'name', cr.name, 'kind', cr.kind, 'ends_at', cr.ends_at, 'is_expired', ce.is_expired, 'prune_at', ce.prune_at, 'has_branding', ce.has_branding)
                    FROM credits cr JOIN credit_entitlements ce ON ce.credit_id = cr.id WHERE cr.id = fe.credit_id
                ),
                'created_at', fe.created_at,
                'updated_at', fe.updated_at
            ) AS item
            FROM filtered_events fe
            ORDER BY fe.created_at DESC
            LIMIT $2 OFFSET $3
        )
        SELECT jsonb_build_object(
            'data', COALESCE((SELECT jsonb_agg(item) FROM paginated_data), '[]'::jsonb),
            'total', COALESCE((SELECT count FROM total_count), 0),
            'page', $4::int,
            'limit', $2::int
        );
    `

    // GetEventQuery fetches a single event with its metadata.
    GetEventQuery = `
        SELECT jsonb_build_object(
            'id', e.id,
            'name', em.name,
            'start_date', to_char(e.start_date, 'YYYY-MM-DD'),
            'end_date', to_char(e.end_date, 'YYYY-MM-DD'),
            'venue', em.venue,
            'logo', em.logo,
            'organizer', em.organizer,
            'timezone', e.timezone,
            'credit', (
                SELECT jsonb_build_object('id', cr.id, 'name', cr.name, 'kind', cr.kind, 'ends_at', cr.ends_at, 'is_expired', ce.is_expired, 'prune_at', ce.prune_at, 'has_branding', ce.has_branding)
                FROM credits cr JOIN credit_entitlements ce ON ce.credit_id = cr.id WHERE cr.id = e.credit_id
            ),
            'created_at', e.created_at,
            'updated_at', e.updated_at
        )
        FROM events e
        JOIN event_metadata em ON em.id = e.id
        WHERE e.id = $1::uuid;
    `

    // CreateEventQuery atomically inserts into events and event_metadata in a single CTE statement.
    CreateEventQuery = `
        WITH ins_event AS (
            INSERT INTO events (
                id,
                organization_id,
                credit_id,
                start_date,
                end_date,
                timezone,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                $4::uuid,
                $5::uuid,
                $1::date,
                $2::date,
                $6,
                now(),
                now()
            )
            RETURNING id, credit_id, start_date, end_date, timezone, created_at, updated_at
        ),
        ins_meta AS (
            INSERT INTO event_metadata (
                id,
                name
            )
            SELECT
                id,
                $3
            FROM ins_event
            RETURNING id, name, venue, logo, organizer
        )
        SELECT jsonb_build_object(
            'id', e.id,
            'name', m.name,
            'start_date', to_char(e.start_date, 'YYYY-MM-DD'),
            'end_date', to_char(e.end_date, 'YYYY-MM-DD'),
            'venue', m.venue,
            'logo', m.logo,
            'organizer', m.organizer,
            'timezone', e.timezone,
            'credit', (
                SELECT jsonb_build_object('id', cr.id, 'name', cr.name, 'kind', cr.kind, 'ends_at', cr.ends_at, 'is_expired', ce.is_expired, 'prune_at', ce.prune_at, 'has_branding', ce.has_branding)
                FROM credits cr JOIN credit_entitlements ce ON ce.credit_id = cr.id WHERE cr.id = e.credit_id
            ),
            'created_at', e.created_at,
            'updated_at', e.updated_at
        )
        FROM ins_event e
        JOIN ins_meta m ON m.id = e.id;
    `

    // UpdateEventQuery atomically updates events and event_metadata in a single CTE statement
    // while verifying the event exists and has not already ended (end_date >= today in the event's timezone).
    UpdateEventQuery = `
        WITH target_event AS (
            SELECT id, end_date, timezone
            FROM events
            WHERE id = $1
        ),
        upd_event AS (
            UPDATE events
            SET
                start_date = COALESCE($2::date, start_date),
                end_date = COALESCE($3::date, end_date),
                timezone = COALESCE($8, timezone),
                updated_at = now()
            WHERE id = (SELECT id FROM target_event WHERE end_date >= (now() AT TIME ZONE timezone)::date)
            RETURNING id, credit_id, start_date, end_date, timezone, created_at, updated_at
        ),
        upd_meta AS (
            UPDATE event_metadata
            SET
                name = COALESCE($4, name),
                venue = COALESCE($5, venue),
                logo = COALESCE($6, logo),
                organizer = COALESCE($7, organizer)
            WHERE id = (SELECT id FROM upd_event)
            RETURNING id, name, venue, logo, organizer
        )
        SELECT jsonb_build_object(
            'status', CASE
                WHEN NOT EXISTS (SELECT 1 FROM target_event) THEN 'not_found'
                WHEN NOT EXISTS (SELECT 1 FROM target_event WHERE end_date >= (now() AT TIME ZONE timezone)::date) THEN 'event_ended'
                ELSE 'success'
            END,
            'data', (
                SELECT jsonb_build_object(
                    'id', e.id,
                    'name', m.name,
                    'start_date', to_char(e.start_date, 'YYYY-MM-DD'),
                    'end_date', to_char(e.end_date, 'YYYY-MM-DD'),
                    'venue', m.venue,
                    'logo', m.logo,
                    'organizer', m.organizer,
                    'timezone', e.timezone,
                    'credit', (
                        SELECT jsonb_build_object('id', cr.id, 'name', cr.name, 'kind', cr.kind, 'ends_at', cr.ends_at, 'is_expired', ce.is_expired, 'prune_at', ce.prune_at, 'has_branding', ce.has_branding)
                        FROM credits cr JOIN credit_entitlements ce ON ce.credit_id = cr.id WHERE cr.id = e.credit_id
                    ),
                    'created_at', e.created_at,
                    'updated_at', e.updated_at
                )
                FROM upd_event e
                JOIN upd_meta m ON m.id = e.id
            )
        );
    `

    // DeleteOrphanApplicantsQuery removes applicants no longer registered to
    // any event (run after deleting an event; its rows cascade away first).
    DeleteOrphanApplicantsQuery = `
        DELETE FROM applicants a
        WHERE NOT EXISTS (SELECT 1 FROM event_applicants ea WHERE ea.user_id = a.id);
    `

    // DeleteEventQuery deletes the event and cascades to event_metadata in a single CTE statement.
    DeleteEventQuery = `
        WITH del AS (
            DELETE FROM events
            WHERE id = $1
            RETURNING id
        )
        SELECT id FROM del;
    `

    // CheckCreditQuery validates a credit for an event's dates. $1 credit,
    // $2 organization, $3 the event being updated (NULL on create), $4/$5
    // start and end date. Returns the status and the credit's date window.
    CheckCreditQuery = `
        SELECT jsonb_build_object(
            'status', CASE
                WHEN c.id IS NULL THEN 'not_found'
                WHEN c.ends_at <= now() THEN 'expired'
                WHEN EXISTS (
                    SELECT 1 FROM events e
                    WHERE e.credit_id = c.id AND e.id IS DISTINCT FROM $3::uuid
                ) THEN 'in_use'
                WHEN $4::date < c.starts_at::date OR $5::date > c.ends_at::date THEN 'outside_window'
                WHEN c.kind = 'trial'
                     AND ($5::date - $4::date + 1) > (SELECT trial_max_event_days FROM pricing_settings WHERE id = 1)
                     THEN 'trial_too_long'
                ELSE 'ok'
            END,
            'starts_on', to_char(c.starts_at, 'YYYY-MM-DD'),
            'ends_on', to_char(c.ends_at, 'YYYY-MM-DD'),
            'trial_max_days', (SELECT trial_max_event_days FROM pricing_settings WHERE id = 1)
        )
        FROM (SELECT 1) AS one
        LEFT JOIN credits c ON c.id = $1::uuid AND c.organization_id = $2::uuid;
    `
)
