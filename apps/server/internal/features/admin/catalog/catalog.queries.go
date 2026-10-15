package catalog

const (
    GetCatalogQuery = `
        SELECT jsonb_build_object(
            'settings', jsonb_build_object(
                'currency', ps.currency,
                'base_fee', ps.base_fee,
                'tax_name', ps.tax_name,
                'tax_rate_bp', ps.tax_rate_bp,
                'trial_max_event_days', ps.trial_max_event_days
            ),
            'features', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', f.id,
                    'key', f.key,
                    'name', f.name,
                    'description', f.description,
                    'value_type', f.value_type,
                    'unit', f.unit,
                    'pricing_type', f.pricing_type,
                    'default_value', f.default_value,
                    'trial_value', f.trial_value,
                    'sort_order', f.sort_order,
                    'options', COALESCE((
                        SELECT jsonb_agg(jsonb_build_object('value', o.value, 'label', o.label, 'is_active', o.is_active) ORDER BY o.sort_order, o.value)
                        FROM feature_options o WHERE o.feature_id = f.id
                    ), '[]'::jsonb),
                    'rates', COALESCE((
                        SELECT jsonb_agg(jsonb_build_object(
                            'min_value', r.min_value, 'max_value', r.max_value,
                            'unit_size', r.unit_size, 'price', r.price
                        ) ORDER BY r.min_value)
                        FROM feature_rates r WHERE r.feature_id = f.id AND r.is_active
                    ), '[]'::jsonb)
                ) ORDER BY f.sort_order, f.name)
                FROM features f
            ), '[]'::jsonb)
        )
        FROM pricing_settings ps
        WHERE ps.id = 1;
    `

    UpdateSettingsQuery = `
        UPDATE pricing_settings
        SET base_fee = $1, tax_name = $2, tax_rate_bp = $3, trial_max_event_days = $4, updated_at = now()
        WHERE id = 1;
    `

    GetValueTypeQuery = `SELECT value_type FROM features WHERE id::text = $1;`

    UpdateFeatureQuery = `
        UPDATE features
        SET name = $2, description = $3, unit = $4, pricing_type = $5,
            default_value = $6, trial_value = $7, updated_at = now()
        WHERE id = $1::uuid;
    `

    DeleteOptionsQuery = `DELETE FROM feature_options WHERE feature_id = $1::uuid;`

    InsertOptionQuery = `
        INSERT INTO feature_options (feature_id, value, label, is_active, sort_order)
        VALUES ($1::uuid, $2, $3, $4, $5);
    `

    DeleteRatesQuery = `DELETE FROM feature_rates WHERE feature_id = $1::uuid;`

    InsertRateQuery = `
        INSERT INTO feature_rates (feature_id, min_value, max_value, unit_size, price)
        VALUES ($1::uuid, $2, $3, $4, $5);
    `
)
