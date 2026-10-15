import type {
    FormFieldOption,
    FormFieldSummary,
    FormFieldValue,
} from "../../schema/applicants.types";

export function getOptionDisplayLabel(
    options: (string | FormFieldOption)[] | null | undefined,
    value: string
): string {
    if (!options || options.length === 0) return value;

    for (const opt of options) {
        if (typeof opt === "string") {
            if (opt === value) return opt;
        } else if (opt && typeof opt === "object") {
            if (String(opt.value) === value) {
                return opt.label || opt.value;
            }
        }
    }
    return value;
}

export function formatFieldValue(
    field: FormFieldSummary,
    val: FormFieldValue
): string {
    if (val === undefined || val === null || val === "") {
        return "-";
    }

    if (typeof val === "boolean") {
        return val ? "Yes" : "No";
    }

    const isOptionField =
        field.type === "radio" ||
        field.type === "checkbox" ||
        field.type === "select";

    if (Array.isArray(val)) {
        if (isOptionField && field.options) {
            return val
                .map((v) => getOptionDisplayLabel(field.options, String(v)))
                .join(", ");
        }
        return val.join(", ");
    }

    if (isOptionField && field.options) {
        return getOptionDisplayLabel(field.options, String(val));
    }

    if (field.type === "date") {
        const d = new Date(String(val));
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString();
    }

    return String(val);
}

export interface ParsedOption {
    label: string;
    value: string;
}

export function parseOptions(
    options: (string | FormFieldOption)[] | null | undefined
): ParsedOption[] {
    return (options ?? []).map((opt) =>
        typeof opt === "string"
            ? { label: opt, value: opt }
            : { label: opt.label || opt.value, value: opt.value }
    );
}

/** Columns stored on the applicant row itself rather than in its form data. */
export const BUILT_IN_FIELDS: FormFieldSummary[] = [
    { key: "name", label: "Full Name", type: "text", required: true },
    { key: "email", label: "Email Address", type: "email", required: true },
    { key: "phone", label: "Mobile Number", type: "phone", required: true },
    { key: "user_id", label: "Applicant ID", type: "text", required: false },
];

const BUILT_IN_KEYS = new Set([...BUILT_IN_FIELDS.map((f) => f.key), "mobile"]);

/** Built-in columns followed by the event form's own fields. */
export function getFilterableFields(fields: FormFieldSummary[]): FormFieldSummary[] {
    return [...BUILT_IN_FIELDS, ...fields.filter((f) => !BUILT_IN_KEYS.has(f.key))];
}

export type FilterKind = "text" | "options" | "boolean" | "range";

const RANGE_TYPES = new Set(["date", "time", "week", "month"]);

export function getFilterKind(field: FormFieldSummary): FilterKind {
    const hasOptions = (field.options?.length ?? 0) > 0;
    if (field.type === "switch" || (field.type === "checkbox" && !hasOptions)) return "boolean";
    if (hasOptions && ["checkbox", "radio", "select"].includes(field.type)) return "options";
    if (RANGE_TYPES.has(field.type)) return "range";
    return "text";
}
