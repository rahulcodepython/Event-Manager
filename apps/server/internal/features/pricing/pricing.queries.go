package pricing

const (
    // GetCatalogQuery loads settings plus every active feature with its
    // active options and rates as one JSON document.
    GetCatalogQuery = `
        SELECT jsonb_build_object(
            'currency', ps.currency,
            'base_fee', ps.base_fee,
            'tax_name', ps.tax_name,
            'tax_rate_bp', ps.tax_rate_bp,
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
                    'options', COALESCE((
                        SELECT jsonb_agg(jsonb_build_object('value', o.value, 'label', o.label) ORDER BY o.sort_order, o.value)
                        FROM feature_options o
                        WHERE o.feature_id = f.id AND o.is_active
                    ), '[]'::jsonb),
                    'rates', COALESCE((
                        SELECT jsonb_agg(jsonb_build_object(
                            'min_value', r.min_value,
                            'max_value', r.max_value,
                            'unit_size', r.unit_size,
                            'price', r.price
                        ) ORDER BY r.min_value)
                        FROM feature_rates r
                        WHERE r.feature_id = f.id AND r.is_active
                    ), '[]'::jsonb)
                ) ORDER BY f.sort_order, f.name)
                FROM features f
                WHERE f.is_active
            ), '[]'::jsonb)
        )
        FROM pricing_settings ps
        WHERE ps.id = 1;
    `
)
