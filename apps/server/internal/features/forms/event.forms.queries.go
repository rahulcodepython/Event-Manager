package forms

const (
    // GetEventFormByEventIDQuery retrieves the event-specific form details.
    GetEventFormByEventIDQuery = `
        SELECT jsonb_build_object(
            'id', ef.id,
            'event_id', ef.event_id,
            'name', ef.name,
            'fields', ef.fields,
            'is_locked', ef.is_locked,
            'locked_at', ef.locked_at,
            'max_applicants', ef.max_applicants,
            'expires_at', ef.expires_at,
            'total_applicants', (SELECT count(*)::int FROM event_applicants WHERE event_id = ef.event_id),
            'can_delete', ((SELECT count(*) FROM event_applicants WHERE event_id = ef.event_id) = 0),
            'created_at', ef.created_at,
            'updated_at', ef.updated_at
        )
        FROM event_forms ef
        WHERE ef.event_id = $1::uuid;
    `

    // CreateEventFormFromTemplateQuery clones fields from an existing template and returns the complete form JSON in 1 round-trip.
    CreateEventFormFromTemplateQuery = `
        WITH inserted AS (
            INSERT INTO event_forms (
                event_id,
                name,
                fields,
                max_applicants,
                expires_at,
                is_locked
            )
            SELECT
                $1::uuid,
                COALESCE(NULLIF($3, ''), ft.name),
                ft.fields,
                $4,
                $5,
                false
            FROM form_templates ft
            WHERE ft.id = $2::uuid
              AND ft.organization_id = (SELECT organization_id FROM events WHERE id = $1::uuid)
            RETURNING *
        ),
        sync_fields AS (
            INSERT INTO form_fields (id, event_form_id, field_type, key, label, placeholder, required, is_system, order_index, options, validation)
            SELECT
                gen_random_uuid(),
                i.id,
                CASE 
                    WHEN (elem->>'type') IN (SELECT type FROM field_types) 
                    THEN (elem->>'type') 
                    ELSE 'text' 
                END,
                elem->>'key',
                COALESCE(elem->>'label', ''),
                COALESCE(elem->>'placeholder', ''),
                COALESCE((elem->>'required')::boolean, false),
                COALESCE((elem->>'is_system')::boolean, false),
                (row_number() OVER () - 1)::int,
                COALESCE(elem->'options', '[]'::jsonb),
                COALESCE(elem->'validation', '{}'::jsonb)
            FROM inserted i,
            jsonb_array_elements(i.fields) AS elem
            WHERE elem->>'key' IS NOT NULL
        )
        SELECT jsonb_build_object(
            'id', i.id,
            'event_id', i.event_id,
            'name', i.name,
            'fields', i.fields,
            'is_locked', i.is_locked,
            'locked_at', i.locked_at,
            'max_applicants', i.max_applicants,
            'expires_at', i.expires_at,
            'total_applicants', 0,
            'can_delete', true,
            'created_at', i.created_at,
            'updated_at', i.updated_at
        )
        FROM inserted i;
    `

    // CreateEventFormFromScratchQuery creates a brand new form instance and returns the complete form JSON in 1 round-trip.
    CreateEventFormFromScratchQuery = `
        WITH inserted AS (
            INSERT INTO event_forms (
                event_id,
                name,
                fields,
                max_applicants,
                expires_at,
                is_locked
            )
            VALUES (
                $1::uuid,
                $2,
                $3::jsonb,
                $4,
                $5,
                false
            )
            RETURNING *
        ),
        sync_fields AS (
            INSERT INTO form_fields (id, event_form_id, field_type, key, label, placeholder, required, is_system, order_index, options, validation)
            SELECT
                gen_random_uuid(),
                i.id,
                CASE 
                    WHEN (elem->>'type') IN (SELECT type FROM field_types) 
                    THEN (elem->>'type') 
                    ELSE 'text' 
                END,
                elem->>'key',
                COALESCE(elem->>'label', ''),
                COALESCE(elem->>'placeholder', ''),
                COALESCE((elem->>'required')::boolean, false),
                COALESCE((elem->>'is_system')::boolean, false),
                (row_number() OVER () - 1)::int,
                COALESCE(elem->'options', '[]'::jsonb),
                COALESCE(elem->'validation', '{}'::jsonb)
            FROM inserted i,
            jsonb_array_elements(i.fields) AS elem
            WHERE elem->>'key' IS NOT NULL
        )
        SELECT jsonb_build_object(
            'id', i.id,
            'event_id', i.event_id,
            'name', i.name,
            'fields', i.fields,
            'is_locked', i.is_locked,
            'locked_at', i.locked_at,
            'max_applicants', i.max_applicants,
            'expires_at', i.expires_at,
            'total_applicants', 0,
            'can_delete', true,
            'created_at', i.created_at,
            'updated_at', i.updated_at
        )
        FROM inserted i;
    `

    // UpdateEventFormQuery updates event form fields and limits while unlocked and returns the full JSON in 1 round-trip.
    UpdateEventFormQuery = `
        WITH form AS (
            SELECT id, is_locked FROM event_forms WHERE event_id = $1::uuid
        ),
        updated AS (
            UPDATE event_forms
            SET
                name = COALESCE($2, name),
                fields = COALESCE($3::jsonb, fields),
                max_applicants = COALESCE($4, max_applicants),
                expires_at = COALESCE($5, expires_at),
                updated_at = now()
            WHERE event_id = $1::uuid
              AND is_locked = false
            RETURNING *
        ),
        sync_fields AS (
            INSERT INTO form_fields (id, event_form_id, field_type, key, label, placeholder, required, is_system, order_index, options, validation)
            SELECT
                gen_random_uuid(),
                u.id,
                CASE 
                    WHEN (elem->>'type') IN (SELECT type FROM field_types) 
                    THEN (elem->>'type') 
                    ELSE 'text' 
                END,
                elem->>'key',
                COALESCE(elem->>'label', ''),
                COALESCE(elem->>'placeholder', ''),
                COALESCE((elem->>'required')::boolean, false),
                COALESCE((elem->>'is_system')::boolean, false),
                (row_number() OVER () - 1)::int,
                COALESCE(elem->'options', '[]'::jsonb),
                COALESCE(elem->'validation', '{}'::jsonb)
            FROM updated u,
            jsonb_array_elements(u.fields) AS elem
            WHERE $3 IS NOT NULL AND elem->>'key' IS NOT NULL
        )
        SELECT jsonb_build_object(
            'exists', (SELECT count(*) FROM form) > 0,
            'is_locked', (SELECT coalesce(bool_or(is_locked), false) FROM form),
            'form', (
                SELECT jsonb_build_object(
                    'id', u.id,
                    'event_id', u.event_id,
                    'name', u.name,
                    'fields', u.fields,
                    'is_locked', u.is_locked,
                    'locked_at', u.locked_at,
                    'max_applicants', u.max_applicants,
                    'expires_at', u.expires_at,
                    'total_applicants', (SELECT count(*)::int FROM event_applicants WHERE event_id = u.event_id),
                    'can_delete', ((SELECT count(*) FROM event_applicants WHERE event_id = u.event_id) = 0),
                    'created_at', u.created_at,
                    'updated_at', u.updated_at
                )
                FROM updated u
            )
        );
    `

    // LockEventFormQuery permanently locks the event form and marks status live, returning the full JSON in 1 round-trip.
    LockEventFormQuery = `
        WITH form AS (
            SELECT id, is_locked, expires_at FROM event_forms WHERE event_id = $1::uuid
        ),
        locked AS (
            UPDATE event_forms
            SET
                is_locked = true,
                locked_at = now(),
                status = 'live',
                updated_at = now()
            WHERE event_id = $1::uuid
              AND is_locked = false
              AND expires_at > now()
            RETURNING *
        )
        SELECT jsonb_build_object(
            'exists', (SELECT count(*) FROM form) > 0,
            'was_locked', (SELECT coalesce(bool_or(is_locked), false) FROM form),
            'is_expired', (SELECT coalesce(bool_or(expires_at <= now()), false) FROM form),
            'form', (
                SELECT jsonb_build_object(
                    'id', ef.id,
                    'event_id', ef.event_id,
                    'name', ef.name,
                    'fields', ef.fields,
                    'is_locked', ef.is_locked,
                    'locked_at', ef.locked_at,
                    'max_applicants', ef.max_applicants,
                    'expires_at', ef.expires_at,
                    'total_applicants', (SELECT count(*)::int FROM event_applicants WHERE event_id = ef.event_id),
                    'can_delete', ((SELECT count(*) FROM event_applicants WHERE event_id = ef.event_id) = 0),
                    'created_at', ef.created_at,
                    'updated_at', ef.updated_at
                )
                FROM (
                    SELECT * FROM locked
                    UNION ALL
                    SELECT * FROM event_forms WHERE event_id = $1::uuid AND (SELECT count(*) FROM locked) = 0
                ) ef
            )
        );
    `

    // DeleteEventFormQuery deletes the event form only if no applicants exist in 1 round-trip.
    DeleteEventFormQuery = `
        WITH form AS (
            SELECT id FROM event_forms WHERE event_id = $1::uuid
        ),
        del AS (
            DELETE FROM event_forms
            WHERE event_id = $1::uuid
              AND NOT EXISTS (
                  SELECT 1 FROM event_applicants WHERE event_id = $1::uuid
              )
            RETURNING id
        )
        SELECT jsonb_build_object(
            'exists', (SELECT count(*) FROM form) > 0,
            'deleted', (SELECT count(*) FROM del) > 0
        );
    `
)
