import { z } from "zod"

import { QuoteSchema } from "./pricing.types"

export const CreditSchema = z.object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(["trial", "paid", "granted"]),
    status: z.enum(["active", "expired", "revoked"]),
    currency: z.string(),
    subtotal: z.number(),
    tax: z.number(),
    total: z.number(),
    starts_at: z.string(),
    ends_at: z.string(),
    prune_at: z.string(),
    created_at: z.string(),
    revoked_at: z.string().nullable(),
    event: z.object({ id: z.string(), name: z.string() }).nullable(),
    features: z.array(
        z.object({
            key: z.string(),
            name: z.string(),
            unit: z.string(),
            value: z.number(),
            label: z.string(),
            amount: z.number(),
        }),
    ),
})

export type Credit = z.infer<typeof CreditSchema>

export const CreateOrderResponseSchema = z.object({
    order_id: z.string(),
    key_id: z.string(),
    amount: z.number(),
    currency: z.string(),
    quote: QuoteSchema,
})

export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>

export const CreditIdSchema = z.object({ credit_id: z.string() })

export const PurchaseCreditSchema = z.object({
    name: z.string().trim().min(1, "Give this credit a name"),
})

export interface RazorpayPaymentResult {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
}
