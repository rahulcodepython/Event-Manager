package auth

const (
    // UpsertGoogleUserQuery links a Google account to a user: match by
    // google_sub first (email may change), else by email (seeded users have
    // no google_sub yet), else insert. Returns the user id.
    UpsertGoogleUserQuery = `
        WITH by_sub AS (
            UPDATE users
            SET email = $2, name = $3, avatar_url = $4, updated_at = now()
            WHERE google_sub = $1
            RETURNING id
        ),
        upserted AS (
            INSERT INTO users (google_sub, email, name, avatar_url)
            SELECT $1, $2, $3, $4
            WHERE NOT EXISTS (SELECT 1 FROM by_sub)
            ON CONFLICT (email) DO UPDATE
            SET google_sub = EXCLUDED.google_sub,
                name = EXCLUDED.name,
                avatar_url = EXCLUDED.avatar_url,
                updated_at = now()
            RETURNING id
        )
        SELECT id::text FROM by_sub
        UNION ALL
        SELECT id::text FROM upserted;
    `

    // GetOrganizationIDQuery returns the user's organization id, or '' if none.
    GetOrganizationIDQuery = `
        SELECT COALESCE((SELECT id::text FROM organizations WHERE owner_id = $1::uuid), '');
    `

    GetMeQuery = `
        SELECT jsonb_build_object(
            'user', jsonb_build_object(
                'id', u.id,
                'email', u.email,
                'name', u.name,
                'avatar_url', u.avatar_url
            ),
            'organization', (
                SELECT jsonb_build_object('id', o.id, 'name', o.name, 'phone', o.phone, 'trial_choice', o.trial_choice)
                FROM organizations o
                WHERE o.owner_id = u.id
            )
        )
        FROM users u
        WHERE u.id = $1::uuid;
    `

    // CreateOrganizationQuery creates the user's single organization;
    // returns no row if one already exists.
    CreateOrganizationQuery = `
        INSERT INTO organizations (owner_id, name, phone)
        VALUES ($1::uuid, $2, $3)
        ON CONFLICT (owner_id) DO NOTHING
        RETURNING jsonb_build_object('id', id, 'name', name, 'phone', phone, 'trial_choice', trial_choice);
    `
)
