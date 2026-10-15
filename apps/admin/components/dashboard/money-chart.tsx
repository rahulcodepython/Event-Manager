"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "../ui/chart"
import { formatMoney } from "../../lib/money"
import { formatMonth } from "../../lib/format"
import type { Dashboard } from "../../schema/dashboard.types"

const config = {
    income: { label: "Income", color: "var(--chart-2)" },
    expenses: { label: "Expenses", color: "var(--chart-1)" },
    refunds: { label: "Refunds", color: "var(--chart-4)" },
} satisfies ChartConfig

export function MoneyChart({ data, currency }: { data: Dashboard["monthly"], currency: string }) {
    return (
        <ChartContainer config={config} className="aspect-auto h-72 w-full">
            <BarChart data={data} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickFormatter={formatMonth} />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={72}
                    tickFormatter={(v: number) => formatMoney(v, currency)}
                />
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            labelFormatter={(label) => formatMonth(String(label))}
                            formatter={(value, name) => <div className="flex w-full justify-between gap-4">
                                <span className="text-muted-foreground">{config[name as keyof typeof config]?.label}</span>
                                <span className="font-mono">{formatMoney(Number(value), currency)}</span>
                            </div>}
                        />
                    }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
                <Bar dataKey="refunds" fill="var(--color-refunds)" radius={4} />
            </BarChart>
        </ChartContainer>
    )
}
