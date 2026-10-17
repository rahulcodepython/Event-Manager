package dates

// Every query takes a scope parameter: '' for the event's own days, or a
// sub-event id for that sub-event's days (which must fall inside the event's).
const (
    // ListEventDatesByMonthQuery retrieves all scheduled dates for an event in a specified month.
    ListEventDatesByMonthQuery = `
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', ed.id,
            'event_id', ed.event_id,
            'sub_event_id', ed.sub_event_id,
            'date', to_char(ed.date, 'YYYY-MM-DD'),
            'start_time', to_char(ed.start_time, 'HH24:MI'),
            'end_time', to_char(ed.end_time, 'HH24:MI'),
            'created_at', ed.created_at,
            'updated_at', ed.updated_at
        ) ORDER BY ed.date ASC), '[]'::jsonb)
        FROM event_dates ed
        WHERE ed.event_id = $1
            AND ed.sub_event_id IS NOT DISTINCT FROM NULLIF($3, '')::uuid
            AND ($2 = '' OR to_char(ed.date, 'YYYY-MM') = $2);
    `

    // OverrideEventDatesAtomicQuery atomically validates dates, purges existing records,
    // and inserts the new batch in a single database network round-trip.
    OverrideEventDatesAtomicQuery = `
        WITH target_event AS (
            SELECT id, start_date, end_date
            FROM events
            WHERE id = $1
        ),
        incoming_dates AS (
            SELECT
                (d->>'date')::date AS date,
                (d->>'start_time')::time AS start_time,
                (d->>'end_time')::time AS end_time
            FROM jsonb_array_elements($2::jsonb) AS d
        ),
        validation AS (
            SELECT
                CASE
                    WHEN NOT EXISTS (SELECT 1 FROM target_event) THEN 'not_found'
                    WHEN EXISTS (
                        SELECT 1 FROM incoming_dates ind
                        CROSS JOIN target_event te
                        WHERE ind.date < te.start_date OR ind.date > te.end_date
                    ) THEN 'date_out_of_range'
                    ELSE 'valid'
                END AS status
        ),
        deleted AS (
            DELETE FROM event_dates
            WHERE event_id = $1
              AND sub_event_id IS NOT DISTINCT FROM NULLIF($3, '')::uuid
              AND (SELECT status FROM validation) = 'valid'
        ),
        inserted AS (
            INSERT INTO event_dates (id, event_id, sub_event_id, date, start_time, end_time, created_at, updated_at)
            SELECT
                gen_random_uuid(),
                $1,
                NULLIF($3, '')::uuid,
                ind.date,
                ind.start_time,
                ind.end_time,
                now(),
                now()
            FROM incoming_dates ind
            WHERE (SELECT status FROM validation) = 'valid'
            RETURNING id, event_id, sub_event_id, date, start_time, end_time, created_at, updated_at
        )
        SELECT jsonb_build_object(
            'status', (SELECT status FROM validation),
            'data', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', u.id,
                    'event_id', u.event_id,
                    'sub_event_id', u.sub_event_id,
                    'date', to_char(u.date, 'YYYY-MM-DD'),
                    'start_time', to_char(u.start_time, 'HH24:MI'),
                    'end_time', to_char(u.end_time, 'HH24:MI'),
                    'created_at', u.created_at,
                    'updated_at', u.updated_at
                ) ORDER BY u.date ASC) FROM inserted u
            ), '[]'::jsonb)
        );
    `

    // SyncEventDatesAtomicQuery atomically deletes specified dates and upserts new/modified dates in a single DB round-trip.
    SyncEventDatesAtomicQuery = `
        WITH target_event AS (
            SELECT id, start_date, end_date
            FROM events
            WHERE id = $1
        ),
        incoming_dates AS (
            SELECT
                (d->>'date')::date AS date,
                (d->>'start_time')::time AS start_time,
                (d->>'end_time')::time AS end_time
            FROM jsonb_array_elements($2::jsonb) AS d
        ),
        validation AS (
            SELECT
                CASE
                    WHEN NOT EXISTS (SELECT 1 FROM target_event) THEN 'not_found'
                    WHEN EXISTS (
                        SELECT 1 FROM incoming_dates ind
                        CROSS JOIN target_event te
                        WHERE ind.date < te.start_date OR ind.date > te.end_date
                    ) THEN 'date_out_of_range'
                    ELSE 'valid'
                END AS status
        ),
        deleted AS (
            DELETE FROM event_dates
            WHERE event_id = $1
              AND sub_event_id IS NOT DISTINCT FROM NULLIF($4, '')::uuid
              AND date = ANY($3::date[])
              AND (SELECT status FROM validation) = 'valid'
        ),
        upserted AS (
            INSERT INTO event_dates (id, event_id, sub_event_id, date, start_time, end_time, created_at, updated_at)
            SELECT
                gen_random_uuid(),
                $1,
                NULLIF($4, '')::uuid,
                ind.date,
                ind.start_time,
                ind.end_time,
                now(),
                now()
            FROM incoming_dates ind
            WHERE (SELECT status FROM validation) = 'valid'
            ON CONFLICT (event_id, (COALESCE(sub_event_id, '00000000-0000-0000-0000-000000000000'::uuid)), date) DO UPDATE
            SET
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                updated_at = now()
            RETURNING id, event_id, sub_event_id, date, start_time, end_time, created_at, updated_at
        )
        SELECT jsonb_build_object(
            'status', (SELECT status FROM validation),
            'data', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', u.id,
                    'event_id', u.event_id,
                    'sub_event_id', u.sub_event_id,
                    'date', to_char(u.date, 'YYYY-MM-DD'),
                    'start_time', to_char(u.start_time, 'HH24:MI'),
                    'end_time', to_char(u.end_time, 'HH24:MI'),
                    'created_at', u.created_at,
                    'updated_at', u.updated_at
                ) ORDER BY u.date ASC) FROM upserted u
            ), '[]'::jsonb)
        );
    `
)
