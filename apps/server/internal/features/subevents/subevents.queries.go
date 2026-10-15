package subevents

const (
    subEventJSON = `
        jsonb_build_object(
            'id', se.id,
            'event_id', se.event_id,
            'name', se.name,
            'description', se.description,
            'venue', se.venue,
            'capacity', se.capacity,
            'link_enabled', se.link_enabled,
            'enrolled', (SELECT count(*) FROM sub_event_applicants sea WHERE sea.sub_event_id = se.id),
            'days', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'date', to_char(ed.date, 'YYYY-MM-DD'),
                    'start_time', to_char(ed.start_time, 'HH24:MI'),
                    'end_time', to_char(ed.end_time, 'HH24:MI')
                ) ORDER BY ed.date)
                FROM event_dates ed WHERE ed.sub_event_id = se.id
            ), '[]'::jsonb),
            'created_at', se.created_at
        )`

    OverviewQuery = `
        SELECT jsonb_build_object(
            'settings', jsonb_build_object(
                'has_form', ef.id IS NOT NULL,
                'mode', COALESCE(ef.sub_event_mode, 'off'),
                'required', COALESCE(ef.sub_event_required, false)
            ),
            'limit', ce.sub_event_limit,
            'sub_events', COALESCE((
                SELECT jsonb_agg(` + subEventJSON + ` ORDER BY se.created_at)
                FROM sub_events se WHERE se.event_id = e.id
            ), '[]'::jsonb)
        )
        FROM events e
        JOIN credit_entitlements ce ON ce.credit_id = e.credit_id
        LEFT JOIN event_forms ef ON ef.event_id = e.id
        WHERE e.id = $1::uuid;
    `

    GetQuery = `SELECT ` + subEventJSON + ` FROM sub_events se WHERE se.id = $1::uuid;`

    BelongsQuery = `SELECT EXISTS (SELECT 1 FROM sub_events WHERE id::text = $1 AND event_id::text = $2);`

    // CountAndLimitQuery: sub-events so far and how many the credit allows.
    CountAndLimitQuery = `
        SELECT (SELECT count(*)::int FROM sub_events WHERE event_id = $1::uuid), ce.sub_event_limit
        FROM events e JOIN credit_entitlements ce ON ce.credit_id = e.credit_id
        WHERE e.id = $1::uuid;
    `

    CreateQuery = `
        INSERT INTO sub_events (event_id, name, description, venue, capacity, link_enabled)
        VALUES ($1::uuid, $2, $3, $4, $5, $6)
        RETURNING id::text;
    `

    UpdateQuery = `
        UPDATE sub_events
        SET name = $2, description = $3, venue = $4, capacity = $5, link_enabled = $6, updated_at = now()
        WHERE id = $1::uuid;
    `

    EnrolledCountQuery = `SELECT count(*)::int FROM sub_event_applicants WHERE sub_event_id = $1::uuid;`

    DeleteQuery = `DELETE FROM sub_events WHERE id = $1::uuid;`

    UpdateSettingsQuery = `
        UPDATE event_forms SET sub_event_mode = $2, sub_event_required = $3, updated_at = now()
        WHERE event_id = $1::uuid;
    `

    // ListEnrolledQuery: $2 search ('' = all), $3 limit, $4 offset.
    ListEnrolledQuery = `
        WITH filtered AS (
            SELECT a.id AS user_id, a.name, ea.email, a.phone, sea.created_at AS enrolled_at
            FROM sub_event_applicants sea
            JOIN applicants a ON a.id = sea.applicant_id
            JOIN event_applicants ea ON ea.event_id = sea.event_id AND ea.user_id = sea.applicant_id
            WHERE sea.sub_event_id = $1::uuid
              AND ($2 = '' OR a.name ILIKE '%' || $2 || '%' OR ea.email ILIKE '%' || $2 || '%' OR a.id ILIKE '%' || $2 || '%')
        )
        SELECT jsonb_build_object(
            'data', COALESCE((
                SELECT jsonb_agg(to_jsonb(f) ORDER BY f.enrolled_at DESC)
                FROM (SELECT * FROM filtered ORDER BY enrolled_at DESC LIMIT $3 OFFSET $4) f
            ), '[]'::jsonb),
            'total', (SELECT count(*) FROM filtered)
        );
    `

    // EnrollQuery adds applicant $3 to sub-event $1 of event $2 unless the
    // sub-event is full. Run under the sub-event's lock. Returns the status
    // and the sub-event name.
    EnrollQuery = `
        WITH se AS (
            SELECT id, name, capacity FROM sub_events WHERE id::text = $1 AND event_id = $2::uuid
        ),
        status AS (
            SELECT CASE
                WHEN NOT EXISTS (SELECT 1 FROM se) THEN 'not_found'
                WHEN NOT EXISTS (SELECT 1 FROM event_applicants WHERE event_id = $2::uuid AND user_id = $3) THEN 'not_registered'
                WHEN EXISTS (SELECT 1 FROM sub_event_applicants WHERE sub_event_id = (SELECT id FROM se) AND applicant_id = $3) THEN 'already'
                WHEN (SELECT capacity FROM se) IS NOT NULL
                     AND (SELECT count(*) FROM sub_event_applicants WHERE sub_event_id = (SELECT id FROM se)) >= (SELECT capacity FROM se)
                     THEN 'full'
                ELSE 'ok'
            END AS code
        ),
        inserted AS (
            INSERT INTO sub_event_applicants (sub_event_id, event_id, applicant_id)
            SELECT se.id, $2::uuid, $3 FROM se, status WHERE status.code = 'ok'
        )
        SELECT code, COALESCE((SELECT name FROM se), '') FROM status;
    `

    // EnrollmentCountQuery: sub-events of the event the applicant is in,
    // other than the ones being requested ($3).
    OtherEnrollmentsQuery = `
        SELECT count(*)::int FROM sub_event_applicants
        WHERE event_id = $1::uuid AND applicant_id = $2 AND NOT (sub_event_id::text = ANY($3::text[]));
    `

    UnenrollQuery = `
        DELETE FROM sub_event_applicants WHERE sub_event_id = $1::uuid AND applicant_id = $2;
    `
)
