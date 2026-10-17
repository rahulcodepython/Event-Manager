import { z } from "zod"

/** Amounts in paise. revenue = income - refunds; profit = revenue - expenses. */
export const MoneySchema = z.object({
    income: z.number(),
    refunds: z.number(),
    expenses: z.number(),
    revenue: z.number(),
    profit: z.number(),
})

export type Money = z.infer<typeof MoneySchema>

export const DashboardSchema = z.object({
    currency: z.string(),
    all_time: MoneySchema,
    this_month: MoneySchema,
    counts: z.object({
        clients: z.number(),
        suspended_clients: z.number(),
        new_clients: z.number(),
        credits_sold: z.number(),
        credits_granted: z.number(),
        trials_claimed: z.number(),
        active_events: z.number(),
    }),
    monthly: z.array(MoneySchema.extend({ month: z.string() })),
    due_subscriptions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        amount: z.number(),
        next_due_on: z.string(),
        overdue: z.boolean(),
    })),
    recent_payments: z.array(z.object({
        id: z.string(),
        organization: z.object({ id: z.string(), name: z.string() }),
        credit_name: z.string(),
        amount: z.number(),
        status: z.string(),
        paid_at: z.string(),
    })),
})

export type Dashboard = z.infer<typeof DashboardSchema>
