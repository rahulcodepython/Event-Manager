import { z } from "zod"

export const SubscriptionSchema = z.object({
    id: z.string(),
    name: z.string(),
    vendor: z.string(),
    amount: z.number(),
    currency: z.string(),
    interval_months: z.number(),
    next_due_on: z.string(),
    status: z.enum(["inactive", "overdue", "due", "upcoming"]),
    category: z.object({ id: z.string(), name: z.string() }).nullable(),
    is_active: z.boolean(),
    notes: z.string(),
    last_renewed_on: z.string().nullable(),
    total_spent: z.number(),
    created_at: z.string(),
})

export type Subscription = z.infer<typeof SubscriptionSchema>

/** Form values: amount in rupees. */
export const SubscriptionFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    vendor: z.string().trim(),
    amount: z.coerce.number().positive("Amount must be positive"),
    interval_months: z.coerce.number().int().min(1).max(120),
    next_due_on: z.string().min(1, "Due date is required"),
    category_id: z.string(),
    is_active: z.boolean(),
    notes: z.string().trim(),
})

export type SubscriptionFormValues = z.infer<typeof SubscriptionFormSchema>

export type SubscriptionInput = Omit<SubscriptionFormValues, "category_id"> & {
    category_id: string | null
}

export type RenewInput = { amount?: number, paid_on?: string }
