"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, ShieldCheckIcon } from "lucide-react"

import { PageHeader } from "../../../../components/generic"
import { Button } from "../../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Input } from "../../../../components/ui/input"
import { Label } from "../../../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select"
import { Separator } from "../../../../components/ui/separator"
import { useBreadcrumbs } from "../../../../hooks/use-breadcrumbs"
import { formatMoney } from "../../../../lib/money"
import { openRazorpayCheckout } from "../../../../lib/razorpay"
import { useMeQuery } from "../../../../query-hooks/auth.api"
import { useCreateOrderMutation, useVerifyPaymentMutation } from "../../../../query-hooks/credits.api"
import { useCatalogQuery, useQuoteQuery } from "../../../../query-hooks/pricing.api"
import type { Selection } from "../../../../schema/pricing.types"

export default function BuyCreditPage() {
    const router = useRouter()
    const { data: me } = useMeQuery()
    const { data: catalog, isLoading } = useCatalogQuery()
    const createOrder = useCreateOrderMutation()
    const verifyPayment = useVerifyPaymentMutation()

    const [name, setName] = React.useState("")
    const [values, setValues] = React.useState<Record<string, number>>({})
    const [paying, setPaying] = React.useState(false)
    // couponInput is typed; couponCode is the one applied to the quote.
    const [couponInput, setCouponInput] = React.useState("")
    const [couponCode, setCouponCode] = React.useState("")

    useBreadcrumbs([
        { title: "Dashboard", url: "/dashboard" },
        { title: "Credits", url: "/dashboard/credits" },
        { title: "Buy credit" },
    ])

    // Each feature starts at its default until the client picks an option.
    const selections: Selection[] = (catalog?.features ?? []).map((f) => ({
        key: f.key,
        value: values[f.key] ?? f.default_value,
    }))
    const { data: quote, isFetching: quoting } = useQuoteQuery(selections, Boolean(catalog), couponCode)
    const couponApplied = Boolean(quote?.coupon)
    const queryClient = useQueryClient()

    const pay = async () => {
        if (!quote || !name.trim()) return
        setPaying(true)
        try {
            const order = await createOrder.mutateAsync({
                name: name.trim(),
                selections,
                coupon_code: couponApplied ? couponCode : undefined,
            })
            if (order.free) {
                // Fully covered by the coupon: the credit already exists.
                queryClient.invalidateQueries({ queryKey: ["credits"] })
                toast.success("Credit ready. A receipt is on its way to your email.")
                router.push("/dashboard/credits")
                return
            }
            const result = await openRazorpayCheckout(order, {
                description: name.trim(),
                email: me?.user.email,
                name: me?.user.name,
            })
            if (result) {
                await verifyPayment.mutateAsync(result)
                router.push("/dashboard/credits")
            }
        } catch {
            // Mutations toast their own errors
        } finally {
            setPaying(false)
        }
    }

    if (isLoading || !catalog) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader
                title="Buy a credit"
                description="Pick what this event needs. The credit is valid from today for the chosen duration."
            />

            <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Configure</CardTitle>
                        <CardDescription>Prices update as you choose.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="credit-name">Credit name *</Label>
                            <Input
                                id="credit-name"
                                placeholder="e.g. Annual Fest 2026"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        {
                            catalog.features.map((f) => {
                                const current = values[f.key] ?? f.default_value
                                const items = f.options.map((o) => ({
                                    value: String(o.value),
                                    label: `${o.label} · ${o.price === 0 ? "Free" : formatMoney(o.price, catalog.currency)}`,
                                }))
                                return <div key={f.key} className="flex flex-col gap-2">
                                    <Label>{f.name}</Label>
                                    <Select
                                        value={String(current)}
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

                <Card className="lg:sticky lg:top-4">
                    <CardHeader>
                        <CardTitle className="text-base">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 text-sm">
                        {
                            quote && <>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Base fee</span>
                                    <span>{formatMoney(quote.base_fee, quote.currency)}</span>
                                </div>
                                {
                                    quote.lines.map((l) => <div key={l.key} className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">{l.name} ({l.label})</span>
                                        <span>{formatMoney(l.amount, quote.currency)}</span>
                                    </div>)
                                }
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>{formatMoney(quote.subtotal, quote.currency)}</span>
                                </div>
                                {
                                    quote.coupon && <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                                        <span>Coupon {quote.coupon.code}</span>
                                        <span>-{formatMoney(quote.discount, quote.currency)}</span>
                                    </div>
                                }
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        {quote.tax_name} {quote.tax_rate_bp / 100}%
                                    </span>
                                    <span>{formatMoney(quote.tax, quote.currency)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between text-base font-semibold">
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
                            {
                                couponCode ? <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setCouponCode("")
                                        setCouponInput("")
                                    }}
                                >
                                    Remove
                                </Button> : <Button type="submit" variant="outline" disabled={!couponInput.trim()}>
                                    Apply
                                </Button>
                            }
                        </form>
                        {
                            couponCode && quote?.coupon_error && <p className="text-xs text-destructive">{quote.coupon_error}</p>
                        }
                        <Button
                            className="mt-2 w-full gap-2"
                            disabled={!quote || quoting || paying || !name.trim()}
                            onClick={pay}
                        >
                            {
                                paying && <Loader2 className="size-4 animate-spin" />
                            }
                            {quote ? quote.total === 0 ? "Get credit for free" : `Pay ${formatMoney(quote.total, quote.currency)}` : "Pay"}
                        </Button>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ShieldCheckIcon className="size-3.5" />
                            Secure payment by Razorpay
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
