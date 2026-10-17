package forms

const (
    // ListFormsQuery retrieves paginated form templates in a single CTE round-trip.
    ListFormsQuery = `
        WITH filtered_templates AS (
            SELECT
                ft.id,
                ft.name,
                ft.fields,
                ft.created_at,
                ft.updated_at
            FROM form_templates ft
            WHERE ft.organization_id = $5::uuid
              AND ($1 = '' OR ft.name ILIKE '%' || $1 || '%')
        ),
        total_count AS (
            SELECT count(*) AS count FROM filtered_templates
        ),
        paginated_data AS (
            SELECT jsonb_build_object(
                'id', ft.id,
                'name', ft.name,
                'fields', ft.fields,
                'created_at', ft.created_at,
                'updated_at', ft.updated_at
            ) AS item
            FROM filtered_templates ft
            ORDER BY ft.created_at DESC
            LIMIT $2 OFFSET $3
        )
        SELECT jsonb_build_object(
            'data', COALESCE((SELECT jsonb_agg(item) FROM paginated_data), '[]'::jsonb),
            'total', COALESCE((SELECT count FROM total_count), 0),
            'page', $4::int,
            'limit', $2::int
        );
    `

    // GetFormQuery fetches a single form template by UUID.
    GetFormQuery = `
        SELECT jsonb_build_object(
            'id', ft.id,
            'name', ft.name,
            'fields', ft.fields,
            'created_at', ft.created_at,
            'updated_at', ft.updated_at
        )
        FROM form_templates ft
        WHERE ft.id = $1;
    `

    // CreateFormQuery creates a new form template with default seeded fields and synchronizes form_fields table.
    CreateFormQuery = `
        WITH new_template AS (
            INSERT INTO form_templates (organization_id, name, fields)
            VALUES ($3::uuid, $1, $2::jsonb)
            RETURNING id, name, fields, created_at, updated_at
        ),
        sync_fields AS (
            INSERT INTO form_fields (id, template_id, field_type, key, label, placeholder, required, is_system, order_index, options, validation)
            SELECT
                CASE 
                    WHEN (elem->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                    THEN (elem->>'id')::uuid 
                    ELSE gen_random_uuid() 
                END,
                nt.id,
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
            FROM new_template nt,
            jsonb_array_elements(nt.fields) AS elem
            WHERE elem->>'key' IS NOT NULL
        )
        SELECT jsonb_build_object(
            'id', id,
            'name', name,
            'fields', fields,
            'created_at', created_at,
            'updated_at', updated_at
        )
        FROM new_template;
    `

    // UpdateFormQuery updates form template metadata (name).
    UpdateFormQuery = `
        UPDATE form_templates
        SET
            name = COALESCE($2, name),
            updated_at = now()
        WHERE id = $1
        RETURNING jsonb_build_object(
            'id', id,
            'name', name,
            'fields', fields,
            'created_at', created_at,
            'updated_at', updated_at
        );
    `

    // UpdateFormFieldsQuery updates the entire fields array for a template and synchronizes form_fields table.
    UpdateFormFieldsQuery = `
        WITH updated_template AS (
            UPDATE form_templates
            SET
                fields = $2::jsonb,
                updated_at = now()
            WHERE id = $1
            RETURNING id, name, fields, created_at, updated_at
        ),
        sync_fields AS (
            INSERT INTO form_fields (id, template_id, field_type, key, label, placeholder, required, is_system, order_index, options, validation)
            SELECT
                CASE 
                    WHEN (elem->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                    THEN (elem->>'id')::uuid 
                    ELSE gen_random_uuid() 
                END,
                $1::uuid,
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
            FROM jsonb_array_elements($2::jsonb) AS elem
            WHERE elem->>'key' IS NOT NULL
        )
        SELECT jsonb_build_object(
            'id', id,
            'name', name,
            'fields', fields,
            'created_at', created_at,
            'updated_at', updated_at
        )
        FROM updated_template;
    `

    // DeleteFormQuery removes a form template.
    DeleteFormQuery = `
        DELETE FROM form_templates WHERE id = $1;
    `
)
