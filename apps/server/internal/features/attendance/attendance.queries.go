package attendance

import "fmt"

const (
    // ListDeviceSubEventsQuery: events the device ($1 token hash) is assigned
    // to, each with its sub-events and their days.
    ListDeviceSubEventsQuery = `
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'event_id', e.id,
            'event_name', COALESCE(em.name, ''),
            'sub_events', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', se.id,
                    'name', se.name,
                    'venue', se.venue,
                    'dates', COALESCE((
                        SELECT jsonb_agg(to_char(ed.date, 'YYYY-MM-DD') ORDER BY ed.date)
                        FROM event_dates ed WHERE ed.sub_event_id = se.id
                    ), '[]'::jsonb)
                ) ORDER BY se.created_at)
                FROM sub_events se WHERE se.event_id = e.id
            ), '[]'::jsonb)
        ) ORDER BY e.start_date), '[]'::jsonb)
        FROM devices d
        JOIN event_devices edv ON edv.device_id = d.id
        JOIN events e ON e.id = edv.event_id
        LEFT JOIN event_metadata em ON em.id = e.id
        WHERE d.token_hash = $1
          AND (d.expires_at IS NULL OR d.expires_at > now());
    `

    // ScanApplicantQuery checks device authentication, event mapping, applicant registration,
    // active event date, and current attendance status in one atomic query.
    ScanApplicantQuery = `
        WITH device_check AS (
            SELECT d.id, d.name, COALESCE(d.actual_name, 'Unknown Hardware') AS actual_name
            FROM devices d
            JOIN event_devices ed ON ed.device_id = d.id
            WHERE ed.event_id = $1::uuid
              AND d.token_hash = $3
              AND (d.expires_at IS NULL OR d.expires_at > now())
            LIMIT 1
        ),
        applicant_check AS (
            SELECT a.id, a.name, a.email, a.phone, a.data, ea.created_at AS registered_at
            FROM applicants a
            JOIN event_applicants ea ON ea.user_id = a.id
            WHERE ea.event_id = $1::uuid
              AND ea.user_id = $2
            LIMIT 1
        ),
        event_check AS (
            SELECT
                e.id,
                COALESCE(em.name, 'Event') AS name,
                to_char(e.start_date, 'YYYY-MM-DD') AS start_date,
                to_char(e.end_date, 'YYYY-MM-DD') AS end_date,
                COALESCE(em.venue, '') AS venue
            FROM events e
            LEFT JOIN event_metadata em ON em.id = e.id
            WHERE e.id = $1::uuid
            LIMIT 1
        ),
        -- $4: '' scans for the event itself, else for that sub-event.
        sub_event_check AS (
            SELECT se.id, se.name, se.venue
            FROM sub_events se
            WHERE $4 <> '' AND se.id::text = $4 AND se.event_id = $1::uuid
        ),
        enrollment_check AS (
            SELECT 1 AS ok
            FROM sub_event_applicants sea
            WHERE sea.sub_event_id = (SELECT id FROM sub_event_check)
              AND sea.applicant_id = $2
        ),
        event_date_check AS (
            SELECT
                ed.id,
                to_char(ed.date, 'YYYY-MM-DD') AS date,
                to_char(ed.start_time, 'HH24:MI:SS') AS start_time,
                to_char(ed.end_time, 'HH24:MI:SS') AS end_time
            FROM event_dates ed
            WHERE ed.event_id = $1::uuid
              AND ed.sub_event_id IS NOT DISTINCT FROM (SELECT id FROM sub_event_check)
            ORDER BY (ed.date = CURRENT_DATE) DESC, ABS(ed.date - CURRENT_DATE) ASC
            LIMIT 1
        ),
        attendance_check AS (
            SELECT att.id, att.entered_at, att.exited_at, att.is_early
            FROM event_attendance att
            WHERE att.event_date_id = (SELECT id FROM event_date_check)
              AND att.applicant_id = $2
            LIMIT 1
        )
        SELECT jsonb_build_object(
            'status_code', CASE
                WHEN (SELECT id FROM device_check) IS NULL THEN 'device_unauthorized'
                WHEN (SELECT id FROM event_check) IS NULL THEN 'event_not_found'
                WHEN $4 <> '' AND (SELECT id FROM sub_event_check) IS NULL THEN 'sub_event_not_found'
                WHEN (SELECT id FROM applicant_check) IS NULL THEN 'applicant_not_registered'
                WHEN $4 <> '' AND NOT EXISTS (SELECT 1 FROM enrollment_check) THEN 'not_enrolled'
                WHEN (SELECT id FROM event_date_check) IS NULL THEN 'no_event_dates'
                ELSE 'ok'
            END,
            'device', (SELECT jsonb_build_object('id', id, 'name', name, 'actual_name', actual_name) FROM device_check),
            'applicant', (SELECT jsonb_build_object('user_id', id, 'name', name, 'email', email, 'phone', phone, 'data', data, 'registered_at', registered_at,
                'photo_key', COALESCE((
                    SELECT ac.data->>(f->>'key') FROM event_forms ef, jsonb_array_elements(ef.fields) f
                    WHERE ef.event_id = $1::uuid AND f->>'type' = 'photo' LIMIT 1
                ), ac.data->>'_photo')) FROM applicant_check ac),
            'event', (SELECT jsonb_build_object('id', id, 'name', name, 'start_date', start_date, 'end_date', end_date, 'venue', venue) FROM event_check),
            'sub_event', (SELECT jsonb_build_object('id', id, 'name', name, 'venue', venue) FROM sub_event_check),
            'event_date', (SELECT jsonb_build_object('id', id, 'date', date, 'start_time', start_time, 'end_time', end_time) FROM event_date_check),
            'attendance', jsonb_build_object(
                'id', (SELECT id FROM attendance_check),
                'status', CASE
                    WHEN (SELECT id FROM attendance_check) IS NULL THEN
                        CASE
                            WHEN (SELECT (edc.date::date < CURRENT_DATE OR (edc.date::date = CURRENT_DATE AND now()::time > edc.end_time::time)) FROM event_date_check edc) THEN 'session_ended'
                            ELSE 'ready_for_entry'
                        END
                    WHEN (SELECT exited_at FROM attendance_check) IS NULL THEN 'ready_for_exit'
                    ELSE 'already_exited'
                END,
                'entered_at', (SELECT entered_at FROM attendance_check),
                'exited_at', (SELECT exited_at FROM attendance_check),
                'is_early', (SELECT is_early FROM attendance_check)
            )
        );
    `

    // MarkEntryAtomicQuery atomically validates device authorization, checks if already entered,
    // verifies event time has not ended, determines punctuality (is_early), and inserts entry attendance in one database roundtrip.
    MarkEntryAtomicQuery = `
        WITH device_check AS (
            SELECT d.id
            FROM devices d
            JOIN event_devices ed ON ed.device_id = d.id
            WHERE ed.event_id = $1::uuid
              AND d.token_hash = $4
              AND (d.expires_at IS NULL OR d.expires_at > now())
            LIMIT 1
        ),
        applicant_check AS (
            SELECT a.id
            FROM applicants a
            JOIN event_applicants ea ON ea.user_id = a.id
            WHERE ea.event_id = $1::uuid
              AND ea.user_id = $2
            LIMIT 1
        ),
        event_date_check AS (
            SELECT ed.id, ed.date, ed.start_time, ed.end_time, ed.sub_event_id
            FROM event_dates ed
            WHERE ed.event_id = $1::uuid
              AND ed.id = $3::uuid
            LIMIT 1
        ),
        existing_attendance AS (
            SELECT att.id, att.entered_at, att.exited_at
            FROM event_attendance att
            WHERE att.event_date_id = $3::uuid
              AND att.applicant_id = $2
            LIMIT 1
        ),
        validation_status AS (
            SELECT CASE
                WHEN (SELECT id FROM device_check) IS NULL THEN 'device_unauthorized'
                WHEN (SELECT id FROM applicant_check) IS NULL THEN 'applicant_not_registered'
                WHEN (SELECT id FROM event_date_check) IS NULL THEN 'event_date_not_found'
                -- A sub-event's day admits only applicants enrolled in it.
                WHEN (SELECT sub_event_id FROM event_date_check) IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM sub_event_applicants sea
                    WHERE sea.sub_event_id = (SELECT sub_event_id FROM event_date_check) AND sea.applicant_id = $2
                ) THEN 'applicant_not_registered'
                WHEN (SELECT (edc.date < CURRENT_DATE OR (edc.date = CURRENT_DATE AND now()::time > edc.end_time)) FROM event_date_check edc) THEN 'session_ended'
                WHEN (SELECT id FROM existing_attendance) IS NOT NULL THEN 'already_entered'
                ELSE 'ok'
            END AS code
        ),
        inserted_entry AS (
            INSERT INTO event_attendance (
                event_id,
                event_date_id,
                applicant_id,
                device_id,
                entered_at,
                is_early,
                created_at,
                updated_at
            )
            SELECT
                $1::uuid,
                $3::uuid,
                $2,
                dc.id,
                now(),
                (now()::time <= edc.start_time),
                now(),
                now()
            FROM validation_status vs
            JOIN device_check dc ON true
            JOIN event_date_check edc ON true
            WHERE vs.code = 'ok'
            RETURNING id, event_id, event_date_id, applicant_id, entered_at, exited_at, is_early
        )
        SELECT jsonb_build_object(
            'status_code', vs.code,
            'attendance', (
                SELECT jsonb_build_object(
                    'id', ie.id,
                    'event_id', ie.event_id,
                    'event_date_id', ie.event_date_id,
                    'applicant_id', ie.applicant_id,
                    'status', 'inside',
                    'entered_at', ie.entered_at,
                    'exited_at', ie.exited_at,
                    'is_early', ie.is_early,
                    'message', 'Applicant entry recorded successfully'
                ) FROM inserted_entry ie
            )
        )
        FROM validation_status vs;
    `

    // MarkExitAtomicQuery atomically validates device authorization, checks if entered & not exited,
    // and updates exit timestamp in one database roundtrip.
    MarkExitAtomicQuery = `
        WITH device_check AS (
            SELECT d.id
            FROM devices d
            JOIN event_devices ed ON ed.device_id = d.id
            WHERE ed.event_id = $1::uuid
              AND d.token_hash = $4
              AND (d.expires_at IS NULL OR d.expires_at > now())
            LIMIT 1
        ),
        applicant_check AS (
            SELECT a.id
            FROM applicants a
            JOIN event_applicants ea ON ea.user_id = a.id
            WHERE ea.event_id = $1::uuid
              AND ea.user_id = $2
            LIMIT 1
        ),
        existing_attendance AS (
            SELECT att.id, att.entered_at, att.exited_at, att.is_early, att.event_id, att.event_date_id, att.applicant_id
            FROM event_attendance att
            WHERE att.event_date_id = $3::uuid
              AND att.applicant_id = $2
            LIMIT 1
        ),
        validation_status AS (
            SELECT CASE
                WHEN (SELECT id FROM device_check) IS NULL THEN 'device_unauthorized'
                WHEN (SELECT id FROM applicant_check) IS NULL THEN 'applicant_not_registered'
                WHEN (SELECT id FROM existing_attendance) IS NULL THEN 'not_entered_yet'
                WHEN (SELECT exited_at FROM existing_attendance) IS NOT NULL THEN 'already_exited'
                ELSE 'ok'
            END AS code
        ),
        updated_exit AS (
            UPDATE event_attendance
            SET exited_at = now(), updated_at = now()
            WHERE event_date_id = $3::uuid
              AND applicant_id = $2
              AND exited_at IS NULL
              AND (SELECT code FROM validation_status) = 'ok'
            RETURNING id, event_id, event_date_id, applicant_id, entered_at, exited_at, is_early
        )
        SELECT jsonb_build_object(
            'status_code', vs.code,
            'attendance', (
                SELECT jsonb_build_object(
                    'id', ue.id,
                    'event_id', ue.event_id,
                    'event_date_id', ue.event_date_id,
                    'applicant_id', ue.applicant_id,
                    'status', 'already_exited',
                    'entered_at', ue.entered_at,
                    'exited_at', ue.exited_at,
                    'is_early', ue.is_early,
                    'message', 'Applicant exit recorded successfully'
                ) FROM updated_exit ue
            )
        )
        FROM validation_status vs;
    `

    // GetAttendanceMetricsQuery computes attendance metrics and charts data in one single database roundtrip.
    GetAttendanceMetricsQuery = `
        -- $4: '' for the event itself, else a sub-event (its enrolled
        -- applicants and its own days).
        WITH applicants_pool AS (
            SELECT ea.user_id
            FROM event_applicants ea
            WHERE ea.event_id = $1::uuid
              AND ($4 = '' OR EXISTS (
                  SELECT 1 FROM sub_event_applicants sea
                  WHERE sea.sub_event_id::text = $4 AND sea.applicant_id = ea.user_id
              ))
        ),
        total_applicants_cnt AS (
            SELECT count(*)::int AS count FROM applicants_pool
        ),
        filtered_attendance AS (
            SELECT
                att.applicant_id,
                att.event_date_id,
                att.entered_at,
                att.exited_at,
                att.is_early,
                to_char(ed.date, 'YYYY-MM-DD') AS event_date
            FROM event_attendance att
            JOIN event_dates ed ON ed.id = att.event_date_id
            WHERE att.event_id = $1::uuid
              AND ed.sub_event_id IS NOT DISTINCT FROM NULLIF($4, '')::uuid
              AND ($2::text IS NULL OR ed.date >= $2::date)
              AND ($3::text IS NULL OR ed.date <= $3::date)
        ),
        unique_attendees_cnt AS (
            SELECT count(DISTINCT applicant_id)::int AS count FROM filtered_attendance
        ),
        dates_attendance AS (
            SELECT
                to_char(ed.date, 'YYYY-MM-DD') AS date,
                count(att.id)::int AS attendees_count
            FROM event_dates ed
            LEFT JOIN event_attendance att ON att.event_date_id = ed.id
            WHERE ed.event_id = $1::uuid
              AND ed.sub_event_id IS NOT DISTINCT FROM NULLIF($4, '')::uuid
              AND ($2::text IS NULL OR ed.date >= $2::date)
              AND ($3::text IS NULL OR ed.date <= $3::date)
            GROUP BY ed.date
            ORDER BY ed.date ASC
        ),
        punctuality_stats AS (
            SELECT
                count(*) FILTER (WHERE is_early = true)::int AS early_count,
                count(*) FILTER (WHERE is_early = false)::int AS late_count
            FROM filtered_attendance
        )
        SELECT jsonb_build_object(
            'overview', jsonb_build_object(
                'total_applicants', (SELECT count FROM total_applicants_cnt),
                'total_attended', (SELECT count FROM unique_attendees_cnt),
                'total_not_attended', GREATEST(0, (SELECT count FROM total_applicants_cnt) - (SELECT count FROM unique_attendees_cnt)),
                'attendance_percentage', CASE
                    WHEN (SELECT count FROM total_applicants_cnt) > 0
                    THEN ROUND(((SELECT count FROM unique_attendees_cnt)::numeric / (SELECT count FROM total_applicants_cnt)::numeric) * 100, 1)
                    ELSE 0.0
                END
            ),
            'by_date', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object('date', da.date, 'attendees_count', da.attendees_count)
                ) FROM dates_attendance da
            ), '[]'::jsonb),
            'punctuality', jsonb_build_object(
                'early_count', (SELECT early_count FROM punctuality_stats),
                'late_count', (SELECT late_count FROM punctuality_stats)
            )
        );
    `
)

// BuildFilteredAttendeeAnalysisQuery dynamically builds the CTE query for attendee analysis table.
func BuildFilteredAttendeeAnalysisQuery(joinClause, whereClause string, limitIdx, offsetIdx, pageIdx, limitIdx2 int) string {
    return fmt.Sprintf(`
        WITH base_attendees AS (
            SELECT
                a.id AS applicant_id,
                a.name,
                a.email,
                COALESCE(NULLIF(a.phone, ''), a.data->>'phone', a.data->>'mobile', '') AS phone,
                ea.event_id,
                att.id AS attendance_id,
                att.event_date_id::text AS event_date_id,
                to_char(ed.date, 'YYYY-MM-DD') AS date,
                to_char(ed.start_time, 'HH24:MI') AS start_time,
                to_char(ed.end_time, 'HH24:MI') AS end_time,
                att.entered_at,
                att.exited_at,
                att.is_early,
                d.name AS device_name,
                CASE
                    WHEN att.id IS NULL THEN 'not_attended'
                    WHEN att.exited_at IS NULL THEN 'inside'
                    ELSE 'attended'
                END AS status
            FROM event_applicants ea
            JOIN applicants a ON a.id = ea.user_id
            %s
            LEFT JOIN devices d ON d.id = att.device_id
            WHERE %s
        ),
        total_count AS (
            SELECT count(*) AS count FROM base_attendees
        ),
        paginated_data AS (
            SELECT jsonb_build_object(
                'applicant_id', ba.applicant_id,
                'name', ba.name,
                'email', ba.email,
                'phone', ba.phone,
                'status', ba.status,
                'event_date_id', ba.event_date_id,
                'date', ba.date,
                'start_time', ba.start_time,
                'end_time', ba.end_time,
                'entered_at', ba.entered_at,
                'exited_at', ba.exited_at,
                'is_early', ba.is_early,
                'device_name', ba.device_name
            ) AS item
            FROM base_attendees ba
            ORDER BY ba.entered_at DESC NULLS LAST, ba.name ASC
            LIMIT $%d OFFSET $%d
        )
        SELECT jsonb_build_object(
            'data', COALESCE((SELECT jsonb_agg(item) FROM paginated_data), '[]'::jsonb),
            'total', COALESCE((SELECT count FROM total_count), 0),
            'page', $%d::int,
            'limit', $%d::int
        );
    `, joinClause, whereClause, limitIdx, offsetIdx, pageIdx, limitIdx2)
}
