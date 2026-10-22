"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Separator } from "../ui/separator"
import { getCatalog, getQuote, loginUrl } from "../../lib/api"
import { formatMoney } from "../../lib/money"
import type { Catalog } from "../../lib/pricing.types"

/** Live price from the server's quote endpoint, the same one checkout uses. */
export function PricingCalculator({ initialCatalog }: { initialCatalog: Catalog | null }) {
    const { data: catalog, isError } = useQuery({
        queryKey: ["catalog"],
        queryFn: () => getCatalog(),
        initialData: initialCatalog ?? undefined,
        // The server-rendered catalog may be cached; load the live one at once.
        initialDataUpdatedAt: 0,
    })
    const [values, setValues] = React.useState<Record<string, number>>({})
    const [couponInput, setCouponInput] = React.useState("")
    const [couponCode, setCouponCode] = React.useState("")

    const selections = (catalog?.features ?? []).map((f) => ({ key: f.key, value: values[f.key] ?? f.default_value }))
    const { data: quote, isFetching } = useQuery({
        queryKey: ["quote", selections, couponCode],
        queryFn: () => getQuote(selections, couponCode),
        enabled: Boolean(catalog),
        placeholderData: (prev) => prev,
    })

    if (isError && !catalog) {
        return <p className="text-center text-sm text-muted-foreground">Prices are unavailable right now. Please try again later.</p>
    }
    if (!catalog) {
        return (
            <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Build your event</CardTitle>
                    <CardDescription>Each event runs on one credit. Pick what it needs.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                    {
                        catalog.features.map((f) => {
                            const items = f.options.map((o) => ({
                                value: String(o.value),
                                label: `${o.label} · ${o.price === 0 ? "Included" : formatMoney(o.price, catalog.currency)}`,
                            }))
                            return <div key={f.key} className="flex flex-col gap-2">
                                <Label>{f.name}</Label>
                                <Select
                                    value={String(values[f.key] ?? f.default_value)}
                                    items={items}
                                    onValueChange={(v) => v !== null && setValues((prev) => ({ ...prev, [f.key]: Number(v) }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {
                                            items.map((item) => <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>)
                                        }
                                    </SelectContent>
                                </Select>
                                {
                                    f.description && <p className="text-xs text-muted-foreground">{f.description}</p>
                                }
                            </div>
                        })
                    }
                </CardContent>
            </Card>

            <Card className="lg:sticky lg:top-20">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                        Your price
                        {
                            isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        }
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                    {
                        quote && <>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Base fee</span>
                                <span>{formatMoney(quote.base_fee, quote.currency)}</span>
                            </div>
                            {
                                quote.lines.filter((l) => l.amount > 0).map((l) => <div key={l.key} className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">{l.name} ({l.label})</span>
                                    <span>{formatMoney(l.amount, quote.currency)}</span>
                                </div>)
                            }
                            {
                                quote.coupon && <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                                    <span>Coupon {quote.coupon.code}</span>
                                    <span>-{formatMoney(quote.discount, quote.currency)}</span>
                                </div>
                            }
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{quote.tax_name} {quote.tax_rate_bp / 100}%</span>
                                <span>{formatMoney(quote.tax, quote.currency)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-semibold">
                                <span>Total</span>
                                <span>{formatMoney(quote.total, quote.currency)}</span>
                            </div>
                        </>
                    }
                    <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                            e.preventDefault()
                            setCouponCode(couponInput.trim().toUpperCase())
                        }}
                    >
                        <Input
                            placeholder="Coupon code"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value)}
                            className="uppercase"
                        />
                        <Button type="submit" variant="outline" disabled={!couponInput.trim()}>
                            Apply
                        </Button>
                    </form>
                    {
                        couponCode && quote?.coupon_error && <p className="text-xs text-destructive">{quote.coupon_error}</p>
                    }
                    {
                        quote?.coupon && <p className="text-xs text-muted-foreground">Enter the same code when you buy. Some codes are limited per account.</p>
                    }
                    <Button className="mt-2 w-full" nativeButton={false} render={<a href={loginUrl} />}>
                        Sign up and buy
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        New accounts can try one small event free. The trial allows events up to {catalog.trial_max_event_days} days.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
