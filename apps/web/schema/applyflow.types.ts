import { z } from "zod";

export const ApplyStateSchema = z.object({
    signed_in: z.boolean(),
    applicant: z.object({ email: z.string(), name: z.string(), picture: z.string() }).nullable(),
    draft: z.object({
        id: z.string(),
        answers: z.record(z.string(), z.any()).default({}),
        sub_event_ids: z.array(z.string()).nullable().default([]),
        current_step: z.number(),
        status: z.enum(["draft", "awaiting_payment", "confirmed", "refunded"]),
        updated_at: z.string(),
        /** Seat held until then while the fee is being paid. */
        hold_until: z.string().nullish(),
        order_id: z.string().nullish(),
    }).nullable(),
    registration: z.object({
        user_id: z.string().default(""),
        status: z.enum(["registered", "refunded"]),
        card_status: z.string().default(""),
        created_at: z.string().nullish(),
        sub_events: z.array(z.string()).nullable().default([]),
        refund_reason: z.string().nullish(),
    }).nullable(),
    /** Application fee in paise (0 = free). */
    fee: z.number().default(0),
    currency: z.string().default("INR"),
});

export type ApplyState = z.infer<typeof ApplyStateSchema>;

export const IntentSchema = z.object({
    nonce: z.string(),
    client_id: z.string(),
    login_uri: z.string(),
});

export type Intent = z.infer<typeof IntentSchema>;

/** What Razorpay Checkout needs to take the application fee. */
export const ApplyCheckoutSchema = z.object({
    order_id: z.string(),
    key_id: z.string(),
    amount: z.number(),
    currency: z.string(),
    name: z.string(),
    email: z.string(),
    hold_until: z.string(),
});

export type ApplyCheckout = z.infer<typeof ApplyCheckoutSchema>;

export type DraftInput = {
    answers: Record<string, unknown>;
    sub_event_ids: string[];
    current_step: number;
};
