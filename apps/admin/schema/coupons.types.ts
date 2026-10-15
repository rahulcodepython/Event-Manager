import { z } from "zod"

export const CouponSchema = z.object({
    id: z.string(),
    code: z.string(),
    description: z.string(),
    kind: z.enum(["percent", "flat"]),
    percent_bp: z.number().nullable(),
    amount: z.number().nullable(),
    max_discount: z.number().nullable(),
    min_subtotal: z.number(),
    starts_at: z.string().nullable(),
    ends_at: z.string().nullable(),
    max_uses: z.number().nullable(),
    max_uses_per_client: z.number().nullable(),
    is_active: z.boolean(),
    uses: z.number(),
    total_discount: z.number(),
    created_at: z.string(),
})

export type Coupon = z.infer<typeof CouponSchema>

/** Wire format: amounts in paise, percent in basis points. */
export type CouponInput = {
    code: string
    description: string
    kind: "percent" | "flat"
    percent_bp: number | null
    amount: number | null
    max_discount: number | null
    min_subtotal: number
    starts_at: string | null
    ends_at: string | null
    max_uses: number | null
    max_uses_per_client: number | null
    is_active: boolean
}
