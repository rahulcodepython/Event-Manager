package events

const (
    // ListEventsQuery retrieves paginated events conforming directly to generic.PaginatedResponse in a single CTE round-trip.
    ListEventsQuery = `
        WITH filtered_events AS (
            SELECT
                e.id,
                em.name,
                to_char(e.start_date, 'YYYY-MM-DD') AS start_date,
                to_char(e.end_date, 'YYYY-MM-DD') AS end_date,
                em.venue,
                em.logo,
                em.organizer,
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
                start_date,
                end_date,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                $4::uuid,
                $1::date,
                $2::date,
                now(),
                now()
            )
            RETURNING id, start_date, end_date, created_at, updated_at
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
            'created_at', e.created_at,
            'updated_at', e.updated_at
        )
        FROM ins_event e
        JOIN ins_meta m ON m.id = e.id;
    `

    // UpdateEventQuery atomically updates events and event_metadata in a single CTE statement
    // while verifying the event exists and has not already ended (end_date >= CURRENT_DATE).
    UpdateEventQuery = `
        WITH target_event AS (
            SELECT id, end_date
            FROM events
            WHERE id = $1
        ),
        upd_event AS (
            UPDATE events
            SET
                start_date = COALESCE($2::date, start_date),
                end_date = COALESCE($3::date, end_date),
                updated_at = now()
            WHERE id = (SELECT id FROM target_event WHERE end_date >= CURRENT_DATE)
            RETURNING id, start_date, end_date, created_at, updated_at
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
                WHEN NOT EXISTS (SELECT 1 FROM target_event WHERE end_date >= CURRENT_DATE) THEN 'event_ended'
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
                    'created_at', e.created_at,
                    'updated_at', e.updated_at
                )
                FROM upd_event e
                JOIN upd_meta m ON m.id = e.id
            )
        );
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
)
