-- 1. Create field_types reference table
CREATE TABLE IF NOT EXISTS field_types (
    type            TEXT PRIMARY KEY,
    label           TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'standard',
    default_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed allowable field types
INSERT INTO field_types (type, label, category, default_config) VALUES
    ('text', 'Short Text', 'text', '{"placeholder": "Type your answer here..."}'::jsonb),
    ('textarea', 'Long Text', 'text', '{"placeholder": "Type your detailed response here..."}'::jsonb),
    ('email', 'Email Address', 'text', '{"placeholder": "you@example.com"}'::jsonb),
    ('phone', 'Mobile Number', 'number', '{"min_length": 10, "max_length": 10, "placeholder": "10-digit mobile number"}'::jsonb),
    ('number', 'Number', 'number', '{"placeholder": "0"}'::jsonb),
    ('url', 'Website URL', 'text', '{"placeholder": "https://"}'::jsonb),
    ('checkbox', 'Checkbox', 'choice', '{"has_options": true}'::jsonb),
    ('radio', 'Radio Group', 'choice', '{"has_options": true}'::jsonb),
    ('switch', 'Toggle Switch', 'choice', '{}'::jsonb),
    ('date', 'Date Picker', 'datetime', '{"placeholder": "YYYY-MM-DD"}'::jsonb),
    ('time', 'Time Picker', 'datetime', '{"placeholder": "HH:MM"}'::jsonb),
    ('month', 'Month Picker', 'datetime', '{"placeholder": "YYYY-MM"}'::jsonb),
    ('week', 'Week Picker', 'datetime', '{"placeholder": "YYYY-Www"}'::jsonb),
    ('file', 'File Upload', 'file', '{"accept": ".pdf, .png, .jpg, .jpeg", "max_file_size_mb": 10}'::jsonb),
    ('select', 'Dropdown Select', 'choice', '{"has_options": true, "placeholder": "Choose an option"}'::jsonb)
ON CONFLICT (type) DO NOTHING;

-- 2. Create form_templates table
CREATE TABLE IF NOT EXISTS form_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    fields          JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_templates_name ON form_templates (name);
CREATE INDEX IF NOT EXISTS idx_form_templates_organization ON form_templates (organization_id, created_at DESC);
