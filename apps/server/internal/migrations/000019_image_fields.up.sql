-- Two form field types for images uploaded on the public form: an
-- applicant photo (cropped square, shown on the ID card and to scanners)
-- and a signature. min_width / min_height are the smallest accepted image.
INSERT INTO field_types (type, label, category, default_config) VALUES
    ('photo', 'Profile Photo', 'file', '{"min_width": 300, "min_height": 300}'::jsonb),
    ('signature', 'Signature', 'file', '{"min_width": 300, "min_height": 100}'::jsonb)
ON CONFLICT (type) DO NOTHING;
