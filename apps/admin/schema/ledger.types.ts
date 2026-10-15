import { z } from "zod"

const RefSchema = z.object({ id: z.string(), name: z.string() })

export const CategoryKindSchema = z.enum(["income", "expense"])
export type CategoryKind = z.infer<typeof CategoryKindSchema>

export const CategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    kind: CategoryKindSchema,
    in_use: z.number(),
    created_at: z.string(),
})

export type Category = z.infer<typeof CategorySchema>

export type CategoryInput = { name: string, kind: CategoryKind }

export const TransactionSchema = z.object({
    id: z.string(),
    kind: z.enum(["income", "expense", "refund"]),
    source: z.enum(["payment", "manual", "subscription"]),
    amount: z.number(),
    currency: z.string(),
    description: z.string(),
    occurred_on: z.string(),
    category: RefSchema.nullable(),
    organization: RefSchema.nullable(),
    subscription: RefSchema.nullable(),
    payment_id: z.string().nullable(),
    created_at: z.string(),
})

export type Transaction = z.infer<typeof TransactionSchema>

export const TransactionListSchema = z.object({
    data: z.array(TransactionSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totals: z.object({
        income: z.number(),
        expense: z.number(),
        refund: z.number(),
        net: z.number(),
    }),
})

export type TransactionList = z.infer<typeof TransactionListSchema>

export type TransactionFilter = {
    kind: string
    source: string
    category_id: string
    from: string
    to: string
    search: string
    page: number
}

/** Manual entry form. amount is in rupees in the form, paise on the wire. */
export const TransactionFormSchema = z.object({
    kind: CategoryKindSchema,
    amount: z.coerce.number().positive("Amount must be positive"),
    description: z.string().trim(),
    occurred_on: z.string().min(1, "Date is required"),
    category_id: z.string(),
})

export type TransactionFormValues = z.infer<typeof TransactionFormSchema>

export type TransactionInput = {
    kind: CategoryKind
    amount: number
    description: string
    occurred_on: string
    category_id: string | null
}
