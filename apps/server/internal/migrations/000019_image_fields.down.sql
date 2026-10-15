DELETE FROM form_fields WHERE field_type IN ('photo', 'signature');
DELETE FROM field_types WHERE type IN ('photo', 'signature');
