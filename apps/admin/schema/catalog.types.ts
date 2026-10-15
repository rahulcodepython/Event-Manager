import { z } from "zod"

export const OptionSchema = z.object({
    value: z.coerce.number().int().min(0, "Must be 0 or more"),
    label: z.string().trim().min(1, "Label is required"),
    is_active: z.boolean(),
})

export const RateSchema = z.object({
    min_value: z.coerce.number().int().min(0, "Must be 0 or more"),
    max_value: z.number().int().nullable(),
    unit_size: z.coerce.number().int().min(1, "Must be at least 1"),
    price: z.number().int().min(0),
})

export const FeatureSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.string(),
    value_type: z.enum(["number", "boolean"]),
    unit: z.string(),
    pricing_type: z.enum(["flat", "per_unit", "tiered"]),
    default_value: z.number(),
    trial_value: z.number(),
    sort_order: z.number(),
    options: z.array(OptionSchema),
    rates: z.array(RateSchema),
})

export type Feature = z.infer<typeof FeatureSchema>

export const SettingsSchema = z.object({
    currency: z.string(),
    base_fee: z.number(),
    tax_name: z.string(),
    tax_rate_bp: z.number(),
    trial_max_event_days: z.number(),
})

export type Settings = z.infer<typeof SettingsSchema>

export const CatalogSchema = z.object({
    settings: SettingsSchema,
    features: z.array(FeatureSchema),
})

export type Catalog = z.infer<typeof CatalogSchema>

export type UpdateSettingsInput = Omit<Settings, "currency">

export type UpdateFeatureInput = Pick<
    Feature,
    "name" | "description" | "unit" | "pricing_type" | "default_value" | "trial_value" | "options" | "rates"
>
