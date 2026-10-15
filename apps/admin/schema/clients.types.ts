import { z } from "zod"

const RefSchema = z.object({ id: z.string(), name: z.string() })

export const ClientSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string(),
    owner: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string(),
        avatar_url: z.string(),
    }),
    trial_choice: z.enum(["claimed", "skipped"]).nullable(),
    suspended_at: z.string().nullable(),
    created_at: z.string(),
    credits: z.number(),
    events: z.number(),
    revenue: z.number(),
})

export type ClientSummary = z.infer<typeof ClientSummarySchema>

export const ClientListSchema = z.object({
    data: z.array(ClientSummarySchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
})

export type ClientList = z.infer<typeof ClientListSchema>

export const ClientCreditSchema = z.object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(["trial", "paid", "granted"]),
    status: z.enum(["active", "expired", "revoked"]),
    currency: z.string(),
    total: z.number(),
    starts_at: z.string(),
    ends_at: z.string(),
    revoked_at: z.string().nullable(),
    created_at: z.string(),
    event: RefSchema.nullable(),
    features: z.array(z.object({
        key: z.string(),
        name: z.string(),
        value: z.number(),
        label: z.string(),
    })),
})

export type ClientCredit = z.infer<typeof ClientCreditSchema>

export const ClientPaymentSchema = z.object({
    id: z.string(),
    credit_name: z.string(),
    credit_id: z.string().nullable(),
    amount: z.number(),
    currency: z.string(),
    status: z.enum(["paid", "refunded"]),
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string().nullable(),
    paid_at: z.string().nullable(),
    refunded_at: z.string().nullable(),
    refund_note: z.string(),
    created_at: z.string(),
})

export type ClientPayment = z.infer<typeof ClientPaymentSchema>

export const ClientDetailSchema = ClientSummarySchema.extend({
    credit_list: z.array(ClientCreditSchema),
    event_list: z.array(z.object({
        id: z.string(),
        name: z.string(),
        start_date: z.string(),
        end_date: z.string(),
        applicants: z.number(),
        credit: RefSchema,
        created_at: z.string(),
    })),
    payment_list: z.array(ClientPaymentSchema),
})

export type ClientDetail = z.infer<typeof ClientDetailSchema>

export type Selection = { key: string, value: number }

export type GrantCreditInput = {
    name: string
    selections: Selection[]
}
