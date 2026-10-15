import { z } from "zod";

export const CardCountsSchema = z.object({
    pending: z.number(),
    queued: z.number(),
    sent: z.number(),
    failed: z.number(),
});

/** An event's application window, card publishing date and delivery counts. */
export const CardStatusSchema = z.object({
    has_form: z.boolean(),
    closes_at: z.string().nullable(),
    publish_at: z.string().nullable(),
    published_at: z.string().nullable(),
    is_closed: z.boolean(),
    counts: CardCountsSchema,
});

export type CardStatus = z.infer<typeof CardStatusSchema>;

export type CardSchedule = {
    closes_at: string;
    publish_at: string;
};

export const QRSchema = z.object({ qr: z.string() });
