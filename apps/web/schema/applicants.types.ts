import { z } from "zod";

export const FormFieldValueSchema = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null(),
]);

export type FormFieldValue = z.infer<typeof FormFieldValueSchema>;

export const ApplicantItemSchema = z.object({
    user_id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().default(""),
    data: z.record(z.string(), FormFieldValueSchema).nullish().default({}),
    created_at: z.string(),
    card_status: z.enum(["pending", "queued", "sent", "failed"]).default("pending"),
    card_sent_at: z.string().nullish(),
    card_error: z.string().nullish(),
    sub_events: z.array(z.object({ id: z.string(), name: z.string() })).default([]),
});

export type ApplicantItem = z.infer<typeof ApplicantItemSchema>;

export const FormFieldOptionSchema = z.object({
    id: z.string().optional(),
    label: z.string(),
    value: z.string(),
});

export type FormFieldOption = z.infer<typeof FormFieldOptionSchema>;

export const FormFieldSummarySchema = z.object({
    id: z.string().optional(),
    key: z.string(),
    label: z.string(),
    type: z.string(),
    required: z.boolean().default(false),
    placeholder: z.string().optional(),
    options: z
        .union([z.array(z.string()), z.array(FormFieldOptionSchema)])
        .nullish(),
});

export type FormFieldSummary = z.infer<typeof FormFieldSummarySchema>;

export const FormSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    fields: z.array(FormFieldSummarySchema),
});

export type FormSummary = z.infer<typeof FormSummarySchema>;

export const PaginatedApplicantResponseSchema = z.object({
    data: z.array(ApplicantItemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    form: FormSummarySchema.nullish(),
});

export type PaginatedApplicantResponse = z.infer<
    typeof PaginatedApplicantResponseSchema
>;

export const ApplicantFilterOpSchema = z.enum([
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "contains",
    "starts_with",
]);

export const ApplicantFilterItemSchema = z.object({
    field: z.string().min(1, "Field is required"),
    op: ApplicantFilterOpSchema,
    value: z.string().trim().min(1, "Value is required"),
});

export type ApplicantFilterItemValues = z.infer<
    typeof ApplicantFilterItemSchema
>;

export interface ApplicantFilter {
    field: string;
    op: z.infer<typeof ApplicantFilterOpSchema>;
    value: string;
}

export interface ApplicantFilters {
    search?: string;
    page?: number;
    pageSize?: number;
    filters?: ApplicantFilter[];
}

export const CreateApplicantSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().email("Valid email is required"),
    phone: z.string().trim().min(1, "Mobile number is required"),
    data: z.record(z.string(), FormFieldValueSchema).optional().default({}),
});

export type CreateApplicantValues = z.infer<typeof CreateApplicantSchema>;

export const DeleteApplicantResponseSchema = z.object({
    user_id: z.string(),
    message: z.string(),
});

export type DeleteApplicantResponse = z.infer<typeof DeleteApplicantResponseSchema>;

export const BulkCreateApplicantsResponseSchema = z.object({
    created: z.number(),
    failed: z.array(
        z.object({
            row: z.number(),
            email: z.string(),
            error: z.string(),
        }),
    ),
});

export type BulkCreateApplicantsResponse = z.infer<typeof BulkCreateApplicantsResponseSchema>;
