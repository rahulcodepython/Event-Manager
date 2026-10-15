import { z } from "zod";

import { PaginatedResponseZod, type PaginatedResponse } from "./common.types";

// =====================================================================
// Event Models & Schemas
// =====================================================================

export const EventSchema = z.object({
    id: z.string(),
    name: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    venue: z.string().optional().nullable(),
    logo: z.string().optional().nullable(),
    organizer: z.string().optional().nullable(),
    credit: z
        .object({
            id: z.string(),
            name: z.string(),
            kind: z.enum(["trial", "paid"]),
            ends_at: z.string(),
            is_expired: z.boolean(),
            prune_at: z.string(),
            has_branding: z.boolean(),
        })
        .nullable(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type Event = z.infer<typeof EventSchema>;

// Payload schema for creating a new event (name, start_date, end_date)
export const CreateEventSchema = z
    .object({
        credit_id: z.string().min(1, "Choose a credit"),
        name: z.string().min(1, "Event name is required"),
        start_date: z.string().min(1, "Start date is required"),
        end_date: z.string().min(1, "End date is required"),
    })
    .refine(
        (data) => !data.start_date || !data.end_date || data.end_date >= data.start_date,
        {
            message: "End date must be greater than or equal to start date",
            path: ["end_date"],
        }
    );

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

// Payload schema for updating an existing event
export const UpdateEventSchema = z.object({
    name: z.string().min(1, "Event name is required").optional(),
    start_date: z.string().min(1, "Start date is required").optional(),
    end_date: z.string().min(1, "End date is required").optional(),
    venue: z.string().optional().nullable(),
    logo: z.string().optional().nullable(),
    organizer: z.string().optional().nullable(),
});
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

// Paginated listing schema
export const EventListResponseSchema = PaginatedResponseZod(EventSchema);
export type EventListResponse = PaginatedResponse<Event>;
