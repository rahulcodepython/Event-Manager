import { z } from "zod";

import { FormFieldSchema } from "./forms.types";

// =====================================================================
// Event Form Details Schema
// =====================================================================

export const EventFormDetailsSchema = z.object({
    id: z.string(),
    event_id: z.string(),
    name: z.string(),
    fields: z.preprocess((val) => (Array.isArray(val) ? val : []), z.array(FormFieldSchema)),
    is_locked: z.boolean(),
    locked_at: z.string().nullish(),
    max_applicants: z.number(),
    expires_at: z.string(),
    cards_publish_at: z.string(),
    cards_published_at: z.string().nullish(),
    total_applicants: z.number(),
    can_delete: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type EventFormDetails = z.infer<typeof EventFormDetailsSchema>;

// =====================================================================
// Request Schemas
// =====================================================================

export const CreateEventFormSchema = z.object({
    source: z.enum(["template", "scratch"]),
    template_id: z.string().optional(),
    name: z.string().min(1, "Form name is required"),
    fields: z.array(FormFieldSchema).optional(),
    max_applicants: z.number().int().refine((n) => n === -1 || n >= 1, {
        message: "Must be -1 (unlimited) or at least 1",
    }),
    expires_at: z.string().min(1, "Expiration date is required"),
});

export type CreateEventFormValues = z.infer<typeof CreateEventFormSchema>;

export const UpdateEventFormSchema = z.object({
    name: z.string().min(1, "Form name is required").optional(),
    fields: z.array(FormFieldSchema).optional(),
    max_applicants: z.number().int().refine((n) => n === -1 || n >= 1, {
        message: "Must be -1 (unlimited) or at least 1",
    }).optional(),
    expires_at: z.string().optional(),
});

export type UpdateEventFormValues = z.infer<typeof UpdateEventFormSchema>;
