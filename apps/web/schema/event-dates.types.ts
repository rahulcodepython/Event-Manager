import { z } from "zod";

// =====================================================================
// Event Dates Models & Schemas
// =====================================================================

export const EventDateSchema = z.object({
    id: z.string(),
    event_id: z.string(),
    date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type EventDate = z.infer<typeof EventDateSchema>;

export const EventDatesListResponseSchema = z.array(EventDateSchema);

export const EventDateItemInputSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM"),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM"),
});

export type EventDateItemInput = z.infer<typeof EventDateItemInputSchema>;

export const BulkUpsertEventDatesSchema = z.object({
    dates: z.array(EventDateItemInputSchema),
});

export type BulkUpsertEventDatesInput = z.infer<typeof BulkUpsertEventDatesSchema>;
