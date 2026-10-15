package applicants

import "fmt"

const (
    // GetEventAssignedFormQuery retrieves assigned form schema for an event.
    GetEventAssignedFormQuery = `
        SELECT jsonb_build_object(
            'id', ef.id,
            'name', ef.name,
            'fields', ef.fields
        )
        FROM event_forms ef
        WHERE ef.event_id = $1::uuid;
    `

    // CreateApplicantAtomicQuery registers an applicant unless the event's
    // credit has ended (or its organization is suspended), its application
    // window has closed, the email is already registered, or the credit's
    // applicant limit (or the extra cap $7, -1 for none) is reached. Run it
    // under the event's applicant lock.
    // Returns {status, applicant}.
    CreateApplicantAtomicQuery = `
        WITH ent AS (
            SELECT ce.applicant_limit, ce.is_expired OR ce.is_suspended AS is_closed
            FROM credit_entitlements ce
            JOIN events e ON e.credit_id = ce.credit_id
            WHERE e.id = $1::uuid
        ),
        check_status AS (
            SELECT CASE
                WHEN NOT EXISTS (SELECT 1 FROM ent) THEN 'not_found'
                WHEN (SELECT is_closed FROM ent) THEN 'expired'
                WHEN EXISTS (SELECT 1 FROM event_forms WHERE event_id = $1::uuid AND expires_at <= now()) THEN 'window_closed'
                WHEN EXISTS (SELECT 1 FROM event_applicants WHERE event_id = $1::uuid AND email = $4) THEN 'already_registered'
                WHEN (SELECT count(*) FROM event_applicants WHERE event_id = $1::uuid)
                     >= LEAST((SELECT applicant_limit FROM ent), CASE WHEN $7::int = -1 THEN (SELECT applicant_limit FROM ent) ELSE $7::int END)
                     THEN 'limit_reached'
                ELSE 'ok'
            END AS code
        ),
        inserted_applicant AS (
            INSERT INTO applicants (id, name, email, phone, data, created_at, updated_at)
            SELECT $2, $3, $4, $5, $6::jsonb, now(), now()
            FROM check_status WHERE code = 'ok'
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, data = EXCLUDED.data, updated_at = now()
            RETURNING id, name, email, phone, data, created_at
        ),
        inserted_event_applicant AS (
            INSERT INTO event_applicants (event_id, user_id, email, created_at)
            SELECT $1::uuid, ia.id, ia.email, now()
            FROM inserted_applicant ia
            RETURNING id
        )
        SELECT jsonb_build_object(
            'status', (SELECT code FROM check_status),
            'applicant', (
                SELECT jsonb_build_object(
                    'user_id', ia.id,
                    'name', ia.name,
                    'email', ia.email,
                    'phone', ia.phone,
                    'data', ia.data,
                    'created_at', ia.created_at
                )
                FROM inserted_applicant ia
            )
        );
    `

    DeleteApplicantQuery = `
        WITH deleted_association AS (
            DELETE FROM event_applicants
            WHERE event_id = $1::uuid AND user_id = $2
            RETURNING user_id
        ),
        deleted_attendance AS (
            DELETE FROM event_attendance
            WHERE event_id = $1::uuid AND applicant_id = $2
        )
        DELETE FROM applicants
        WHERE id = $2
          AND EXISTS (SELECT 1 FROM deleted_association)
          AND NOT EXISTS (SELECT 1 FROM event_applicants WHERE user_id = $2);
    `
)

// BuildFilteredApplicantsQuery constructs the dynamic CTE query for filtering and paginating event applicants.
func BuildFilteredApplicantsQuery(whereClause string, limitIdx, offsetIdx, pageIdx, limitIdx2 int) string {
    return fmt.Sprintf(`
        WITH filtered_applicants AS (
            SELECT
                a.id AS user_id,
                a.name,
                a.email,
                a.phone,
                a.data,
                ea.created_at,
                ea.event_id,
                ea.card_status,
                ea.card_sent_at,
                ea.card_error
            FROM event_applicants ea
            JOIN applicants a ON a.id = ea.user_id
            WHERE %s
        ),
        total_count AS (
            SELECT count(*) AS count FROM filtered_applicants
        ),
        paginated_data AS (
            SELECT jsonb_build_object(
                'user_id', fa.user_id,
                'name', fa.name,
                'email', fa.email,
                'phone', fa.phone,
                'data', fa.data,
                'created_at', fa.created_at,
                'card_status', fa.card_status,
                'card_sent_at', fa.card_sent_at,
                'card_error', fa.card_error,
                'sub_events', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object('id', se.id, 'name', se.name) ORDER BY se.created_at)
                    FROM sub_event_applicants sea JOIN sub_events se ON se.id = sea.sub_event_id
                    WHERE sea.event_id = fa.event_id AND sea.applicant_id = fa.user_id
                ), '[]'::jsonb)
            ) AS item
            FROM filtered_applicants fa
            ORDER BY fa.created_at DESC
            LIMIT $%d OFFSET $%d
        )
        SELECT jsonb_build_object(
            'data', COALESCE((SELECT jsonb_agg(item) FROM paginated_data), '[]'::jsonb),
            'total', COALESCE((SELECT count FROM total_count), 0),
            'page', $%d::int,
            'limit', $%d::int
        );
    `, whereClause, limitIdx, offsetIdx, pageIdx, limitIdx2)
}
