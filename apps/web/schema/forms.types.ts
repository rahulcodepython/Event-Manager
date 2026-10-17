import { z } from "zod";

import { PaginatedResponseZod, type PaginatedResponse } from "./common.types";

// =====================================================================
// Supported Field Types
// =====================================================================

export const FORM_FIELD_TYPES = [
    "text",
    "textarea",
    "email",
    "phone",
    "number",
    "url",
    "checkbox",
    "radio",
    "select",
    "switch",
    "date",
    "time",
    "month",
    "week",
    "file",
    "photo",
    "signature",
] as const;

/** Image fields uploaded on the public form; at most one of each per form. */
export const IMAGE_FIELD_TYPES = ["photo", "signature"] as const;
export const isImageField = (type: string) => (IMAGE_FIELD_TYPES as readonly string[]).includes(type);

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

// =====================================================================
// Field Option & Validation Schemas
// =====================================================================

export const FieldOptionSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
});

export type FieldOption = z.infer<typeof FieldOptionSchema>;

export const FieldValidationSchema = z.object({
    min: z.number().nullish(),
    max: z.number().nullish(),
    min_length: z.number().nullish(),
    max_length: z.number().nullish(),
    pattern: z.string().nullish(),
    accept: z.string().nullish(),
    max_file_size_mb: z.number().nullish(),
    multiple: z.boolean().nullish(),
    /** Smallest accepted image in pixels (photo and signature fields). */
    min_width: z.number().nullish(),
    min_height: z.number().nullish(),
});

export type FieldValidation = z.infer<typeof FieldValidationSchema>;

// =====================================================================
// Form Field Schema (Stored in Postgres JSONB)
// =====================================================================

export const FormFieldSchema = z.object({
    id: z.string(),
    key: z.string(),
    label: z.string(),
    type: z.enum(FORM_FIELD_TYPES),
    required: z.preprocess((val) => val ?? false, z.boolean()),
    placeholder: z.preprocess((val) => (typeof val === "string" ? val : ""), z.string()),
    is_system: z.preprocess((val) => val ?? false, z.boolean()),
    options: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(FieldOptionSchema)),
    validation: FieldValidationSchema.nullish(),
});



export type FormField = z.infer<typeof FormFieldSchema>;

// =====================================================================
// Form Entity Schemas
// =====================================================================

export const FormSchema = z.object({
    id: z.string(),
    name: z.string(),
    fields: z.array(FormFieldSchema),
    created_at: z.string(),
    updated_at: z.string(),
});

export type Form = z.infer<typeof FormSchema>;

export const PaginatedFormsSchema = PaginatedResponseZod(FormSchema);
export type PaginatedForms = PaginatedResponse<Form>;

// =====================================================================
// Request Payload Schemas
// =====================================================================

export const CreateFormSchema = z.object({
    name: z.string().min(1, "Form name is required").trim(),
});

export type CreateFormInput = z.infer<typeof CreateFormSchema>;

export const UpdateFormSchema = z.object({
    name: z.string().min(1, "Form name is required").trim(),
});

export type UpdateFormInput = z.infer<typeof UpdateFormSchema>;

export const UpdateFormFieldsSchema = z.object({
    fields: z.array(FormFieldSchema),
});

export type UpdateFormFieldsInput = z.infer<typeof UpdateFormFieldsSchema>;
