import { z } from "zod"

export const CatalogOptionSchema = z.object({
    value: z.number(),
    label: z.string(),
    price: z.number(),
})

export const CatalogFeatureSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.string(),
    value_type: z.enum(["number", "boolean"]),
    unit: z.string(),
    default_value: z.number(),
    trial_value: z.number(),
    options: z.array(CatalogOptionSchema),
})

export const CatalogSchema = z.object({
    currency: z.string(),
    base_fee: z.number(),
    tax_name: z.string(),
    tax_rate_bp: z.number(),
    trial_max_event_days: z.number(),
    features: z.array(CatalogFeatureSchema),
})

export type CatalogFeature = z.infer<typeof CatalogFeatureSchema>
export type Catalog = z.infer<typeof CatalogSchema>

export interface Selection {
    key: string
    value: number
}

export const QuoteSchema = z.object({
    currency: z.string(),
    lines: z.array(
        z.object({
            feature_id: z.string(),
            key: z.string(),
            name: z.string(),
            value: z.number(),
            label: z.string(),
            amount: z.number(),
        }),
    ),
    base_fee: z.number(),
    /** Before the discount; tax is on subtotal - discount. */
    subtotal: z.number(),
    discount: z.number().default(0),
    coupon: z.object({ code: z.string(), description: z.string() }).nullish(),
    /** Why a previewed coupon does not apply. */
    coupon_error: z.string().nullish(),
    tax_name: z.string(),
    tax_rate_bp: z.number(),
    tax: z.number(),
    total: z.number(),
})

export type Quote = z.infer<typeof QuoteSchema>
