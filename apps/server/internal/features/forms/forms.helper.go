package forms

import (
    "encoding/json"
    "fmt"
)

type rawFieldCheck struct {
    Key      string `json:"key"`
    Type     string `json:"type"`
    IsSystem bool   `json:"is_system"`
}

func intPtr(v int) *int {
    return &v
}

// DefaultFormFields returns the minimal mandatory system fields required for every form template.
func DefaultFormFields() []FormField {
    return []FormField{
        {
            ID:          "field_default_name",
            Key:         "name",
            Label:       "Full Name",
            Type:        "text",
            Required:    true,
            Placeholder: "Enter your full name",
            IsSystem:    true,
            Options:     []FieldOption{},
        },
        {
            ID:          "field_default_email",
            Key:         "email",
            Label:       "Email Address",
            Type:        "email",
            Required:    true,
            Placeholder: "name@example.com",
            IsSystem:    true,
            Options:     []FieldOption{},
        },
        {
            ID:          "field_default_phone",
            Key:         "phone",
            Label:       "Mobile Number",
            Type:        "phone",
            Required:    true,
            Placeholder: "10-digit mobile number",
            IsSystem:    true,
            Options:     []FieldOption{},
            Validation: &FieldValidation{
                MinLength: intPtr(10),
                MaxLength: intPtr(10),
            },
        },
    }
}

// defaultEventFormFields returns the raw JSON representation of default event form fields.
func defaultEventFormFields() []byte {
    return []byte(`[
        {"id":"field_default_name","key":"name","type":"text","label":"Full Name","options":[],"required":true,"is_system":true,"placeholder":"Enter your full name"},
        {"id":"field_default_email","key":"email","type":"email","label":"Email Address","options":[],"required":true,"is_system":true,"placeholder":"name@example.com"},
        {"id":"field_default_phone","key":"phone","type":"phone","label":"Mobile Number","options":[],"required":true,"is_system":true,"placeholder":"10-digit mobile number","validation":{"min_length":10,"max_length":10}}
    ]`)
}

// validateEventFieldsJSON validates that the provided JSON contains mandatory name, email, and phone fields.
func validateEventFieldsJSON(raw []byte) error {
    if len(raw) == 0 {
        return ErrMissingMandatoryFields
    }
    var fields []rawFieldCheck
    if err := json.Unmarshal(raw, &fields); err != nil {
        return err
    }
    types := make([]string, len(fields))
    for i, f := range fields {
        types[i] = f.Type
    }
    if err := checkImageFields(types); err != nil {
        return err
    }

    var hasName, hasEmail, hasPhone bool
    for _, f := range fields {
        if !SupportedFieldTypes[f.Type] {
            return ErrInvalidFieldType
        }
        if f.Key == "name" || (f.IsSystem && f.Type == "text") {
            hasName = true
        }
        if f.Key == "email" || (f.IsSystem && f.Type == "email") {
            hasEmail = true
        }
        if f.Key == "phone" || (f.IsSystem && f.Type == "phone") {
            hasPhone = true
        }
    }
    if !hasName || !hasEmail || !hasPhone {
        return ErrMissingMandatoryFields
    }
    return nil
}

// checkImageFields allows at most one photo and one signature field.
func checkImageFields(types []string) error {
    seen := map[string]bool{}
    for _, t := range types {
        if !ImageFieldTypes[t] {
            continue
        }
        if seen[t] {
            return fmt.Errorf("%w: a form can have only one %s field", ErrInvalidFieldType, t)
        }
        seen[t] = true
    }
    return nil
}
