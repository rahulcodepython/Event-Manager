package sites

const (
    GetSiteQuery = `
        SELECT jsonb_build_object(
            'entitled', ce.has_event_site,
            'active', ce.has_event_site AND NOT ce.is_expired AND NOT ce.is_suspended,
            'slug', es.slug,
            'version', es.version,
            'file_count', COALESCE(es.file_count, 0),
            'total_bytes', COALESCE(es.total_bytes, 0),
            'uploaded_at', es.uploaded_at
        )
        FROM events e
        JOIN credit_entitlements ce ON ce.credit_id = e.credit_id
        LEFT JOIN event_sites es ON es.event_id = e.id
        WHERE e.id = $1::uuid;
    `

    SlugTakenQuery = `
        SELECT EXISTS (SELECT 1 FROM event_sites WHERE slug = $1 AND event_id::text <> $2);
    `

    ClaimQuery = `
        INSERT INTO event_sites (event_id, slug) VALUES ($1::uuid, $2)
        ON CONFLICT (event_id) DO UPDATE SET slug = EXCLUDED.slug, updated_at = now();
    `

    // SetVersionQuery points the site at a new upload and returns the old
    // version ('' if none). No row if the event has no site (slug) yet.
    SetVersionQuery = `
        WITH old AS (SELECT version FROM event_sites WHERE event_id = $1::uuid)
        UPDATE event_sites
        SET version = $2, file_count = $3, total_bytes = $4, uploaded_at = now(), updated_at = now()
        WHERE event_id = $1::uuid
        RETURNING COALESCE((SELECT version FROM old), '');
    `

    DeleteSiteQuery = `DELETE FROM event_sites WHERE event_id = $1::uuid RETURNING slug;`
)
