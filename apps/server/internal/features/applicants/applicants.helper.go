package applicants

import (
    "fmt"
    "regexp"
    "strconv"
    "strings"
)

var safeIdentRegex = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

// buildApplicantFilterClauses constructs SQL where clauses and parameter arguments
// based on dynamic applicant filters and form field definitions.
func buildApplicantFilterClauses(
    filters []ApplicantFilter,
    fieldMap map[string]FormFieldItem,
    whereClauses []string,
    args []any,
) ([]string, []any) {
    for _, flt := range filters {
        key := strings.TrimSpace(flt.Field)
        op := strings.ToLower(strings.TrimSpace(flt.Op))
        val := strings.TrimSpace(flt.Value)
        if key == "" || val == "" {
            continue
        }

        // Standard direct columns
        if key == "name" {
            switch op {
            case "eq":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.name = $%d", len(args)))
            case "neq":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.name != $%d", len(args)))
            case "starts_with":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.name ILIKE $%d || '%%'", len(args)))
            default: // contains
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.name ILIKE '%%' || $%d || '%%'", len(args)))
            }
            continue
        }

        if key == "email" {
            switch op {
            case "eq":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.email = $%d", len(args)))
            case "neq":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.email != $%d", len(args)))
            default:
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.email ILIKE '%%' || $%d || '%%'", len(args)))
            }
            continue
        }

        if key == "user_id" {
            switch op {
            case "eq":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.id = $%d", len(args)))
            default:
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.id ILIKE '%%' || $%d || '%%'", len(args)))
            }
            continue
        }

        if key == "phone" {
            switch op {
            case "eq":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.phone = $%d", len(args)))
            case "neq":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.phone != $%d", len(args)))
            case "starts_with":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.phone ILIKE $%d || '%%'", len(args)))
            default: // contains
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("a.phone ILIKE '%%' || $%d || '%%'", len(args)))
            }
            continue
        }

        // Check if key is a valid identifier and exists in the form schema
        if !safeIdentRegex.MatchString(key) {
            continue
        }

        fieldDef, ok := fieldMap[key]
        if !ok {
            continue
        }

        fieldType := strings.ToLower(fieldDef.Type)
        switch fieldType {
        case "number":
            // Validate that val is a valid number to prevent postgres numeric cast errors
            if _, err := strconv.ParseFloat(val, 64); err != nil {
                continue
            }
            var opSql string
            switch op {
            case "gt":
                opSql = ">"
            case "gte":
                opSql = ">="
            case "lt":
                opSql = "<"
            case "lte":
                opSql = "<="
            case "neq":
                opSql = "!="
            default:
                opSql = "="
            }
            args = append(args, val)
            whereClauses = append(whereClauses, fmt.Sprintf("((a.data->>'%s') ~ '^-?[0-9]+(\\.[0-9]+)?$' AND ((a.data->>'%s')::numeric) %s $%d::numeric)", key, key, opSql, len(args)))

        case "date":
            var opSql string
            switch op {
            case "gt":
                opSql = ">"
            case "gte":
                opSql = ">="
            case "lt":
                opSql = "<"
            case "lte":
                opSql = "<="
            case "neq":
                opSql = "!="
            default:
                opSql = "="
            }
            args = append(args, val)
            whereClauses = append(whereClauses, fmt.Sprintf("((a.data->>'%s') ~ '^\\d{4}-\\d{2}-\\d{2}' AND ((a.data->>'%s')::date) %s $%d::date)", key, key, opSql, len(args)))

        case "time", "month", "week":
            var opSql string
            switch op {
            case "gt":
                opSql = ">"
            case "gte":
                opSql = ">="
            case "lt":
                opSql = "<"
            case "lte":
                opSql = "<="
            case "neq":
                opSql = "!="
            default:
                opSql = "="
            }
            args = append(args, val)
            whereClauses = append(whereClauses, fmt.Sprintf("((a.data->>'%s') IS NOT NULL AND (a.data->>'%s') %s $%d)", key, key, opSql, len(args)))

        case "checkbox":
            if op == "contains" {
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("((jsonb_typeof(a.data->'%s') = 'array' AND a.data->'%s' ? $%d) OR (a.data->>'%s') ILIKE '%%' || $%d || '%%')", key, key, len(args), key, len(args)))
            } else if op == "neq" {
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("(NOT (jsonb_typeof(a.data->'%s') = 'array' AND a.data->'%s' ? $%d) AND COALESCE(a.data->>'%s', '') != $%d)", key, key, len(args), key, len(args)))
            } else { // eq or default
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("((jsonb_typeof(a.data->'%s') = 'array' AND a.data->'%s' ? $%d) OR COALESCE(a.data->>'%s', '') = $%d)", key, key, len(args), key, len(args)))
            }

        case "switch":
            if op == "neq" {
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("COALESCE(a.data->>'%s', 'false') != $%d", key, len(args)))
            } else {
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("COALESCE(a.data->>'%s', 'false') = $%d", key, len(args)))
            }

        case "radio", "select":
            switch op {
            case "neq":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("(a.data->>'%s') != $%d", key, len(args)))
            case "contains":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("(a.data->>'%s') ILIKE '%%' || $%d || '%%'", key, len(args)))
            default: // eq
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("(a.data->>'%s') = $%d", key, len(args)))
            }

        default: // text, textarea, email, url, file, etc.
            switch op {
            case "eq":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("(a.data->>'%s') = $%d", key, len(args)))
            case "neq":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("(a.data->>'%s') != $%d", key, len(args)))
            case "starts_with":
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("(a.data->>'%s') ILIKE $%d || '%%'", key, len(args)))
            default: // contains
                args = append(args, val)
                whereClauses = append(whereClauses, fmt.Sprintf("(a.data->>'%s') ILIKE '%%' || $%d || '%%'", key, len(args)))
            }
        }
    }

    return whereClauses, args
}
