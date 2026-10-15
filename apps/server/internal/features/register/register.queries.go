package register

const (
    // GetPublicApplyQuery loads event_forms by id, joins event metadata and form fields.
    // If form is not locked, query returns no rows (404 no such form exists).
    // Closed (form deadline passed, the event's credit ended or its
    // organization is suspended) or full
    // returns the form schema as NULL.
    GetPublicApplyQuery = `
        WITH cfg AS (
            SELECT
                ef.*,
                (ef.expires_at < now() OR ce.is_expired OR ce.is_suspended) AS closed,
                ce.has_branding,
                -- effective capacity: the form's own cap, never above the credit's limit
                LEAST(ce.applicant_limit, CASE WHEN ef.max_applicants = -1 THEN ce.applicant_limit ELSE ef.max_applicants END) AS capacity,
                (SELECT count(*)::int FROM event_applicants WHERE event_id = ef.event_id) AS current_count
            FROM event_forms ef
            JOIN events ev ON ev.id = ef.event_id
            JOIN credit_entitlements ce ON ce.credit_id = ev.credit_id
            WHERE ef.id = $1 AND ef.is_locked = true
        )
        SELECT jsonb_build_object(
            'event_form_id', ef.id,
            'status', ef.status,
            'is_expired', ef.closed,
            'is_full', ef.current_count >= ef.capacity,
            'max_applicants', ef.capacity,
            'current_applicants', ef.current_count,
            'branding', ef.has_branding,
            'sub_events', jsonb_build_object(
                'mode', ef.sub_event_mode,
                'required', ef.sub_event_required,
                'options', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', se.id,
                        'name', se.name,
                        'description', se.description,
                        'venue', se.venue,
                        'link_enabled', se.link_enabled,
                        'is_full', se.capacity IS NOT NULL AND (SELECT count(*) FROM sub_event_applicants sea WHERE sea.sub_event_id = se.id) >= se.capacity,
                        'days', COALESCE((
                            SELECT jsonb_agg(jsonb_build_object(
                                'date', to_char(ed.date, 'YYYY-MM-DD'),
                                'start_time', to_char(ed.start_time, 'HH24:MI'),
                                'end_time', to_char(ed.end_time, 'HH24:MI')
                            ) ORDER BY ed.date)
                            FROM event_dates ed WHERE ed.sub_event_id = se.id
                        ), '[]'::jsonb)
                    ) ORDER BY se.created_at)
                    FROM sub_events se WHERE se.event_id = ef.event_id
                ), '[]'::jsonb)
            ),
            'expires_at', ef.expires_at,
            'event', jsonb_build_object(
                'id', e.id,
                'name', COALESCE(em.name, ''),
                'start_date', to_char(e.start_date, 'YYYY-MM-DD'),
                'end_date', to_char(e.end_date, 'YYYY-MM-DD'),
                'venue', em.venue,
                'logo', em.logo,
                'organizer', em.organizer
            ),
            'form', CASE
                WHEN ef.closed OR ef.current_count >= ef.capacity
                THEN NULL
                ELSE jsonb_build_object(
                    'id', ef.id,
                    'name', ef.name,
                    'fields', ef.fields
                )
            END
        )
        FROM cfg ef
        JOIN events e ON e.id = ef.event_id
        LEFT JOIN event_metadata em ON em.id = e.id;
    `
)
