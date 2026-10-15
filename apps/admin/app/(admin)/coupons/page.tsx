"use client"

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { CouponDialog } from "../../../components/coupons/coupon-dialog"
import { ConfirmButton } from "../../../components/generic/confirm-button"
import { PageHeader } from "../../../components/generic/page-header"
import { PageLoader } from "../../../components/generic/page-loader"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Card, CardContent } from "../../../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table"
import { useBreadcrumbs } from "../../../hooks/use-breadcrumbs"
import { formatDate } from "../../../lib/format"
import { formatMoney } from "../../../lib/money"
import { useCouponsQuery, useDeleteCouponMutation } from "../../../query-hooks/coupons.api"
import type { Coupon } from "../../../schema/coupons.types"

function value(c: Coupon) {
    if (c.kind === "flat") return `${formatMoney(c.amount ?? 0)} off`
    const pct = `${(c.percent_bp ?? 0) / 100}% off`
    return c.max_discount ? `${pct}, up to ${formatMoney(c.max_discount)}` : pct
}

function status(c: Coupon): { label: string, variant: "default" | "secondary" | "outline" | "destructive" } {
    const now = Date.now()
    if (!c.is_active) return { label: "Inactive", variant: "outline" }
    if (c.ends_at && new Date(c.ends_at).getTime() <= now) return { label: "Expired", variant: "secondary" }
    if (c.starts_at && new Date(c.starts_at).getTime() > now) return { label: "Scheduled", variant: "secondary" }
    if (c.max_uses && c.uses >= c.max_uses) return { label: "Used up", variant: "secondary" }
    return { label: "Active", variant: "default" }
}

export default function CouponsPage() {
    const { data: coupons, isLoading } = useCouponsQuery()
    const remove = useDeleteCouponMutation()

    useBreadcrumbs([{ title: "Coupons" }])

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader
                title="Coupons"
                description="Discount codes clients enter when buying a credit. A use counts when the purchase completes."
                actions={
                    <CouponDialog trigger={
                        <Button className="gap-2">
                            <PlusIcon className="size-4" />
                            New coupon
                        </Button>
                    } />
                }
            />
            {
                isLoading || !coupons ? <PageLoader /> : <Card>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead>Valid</TableHead>
                                    <TableHead>Limits</TableHead>
                                    <TableHead className="text-right">Uses</TableHead>
                                    <TableHead className="text-right">Given</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {
                                    coupons.length === 0 && <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No coupons yet.</TableCell>
                                    </TableRow>
                                }
                                {
                                    coupons.map((c) => {
                                        const s = status(c)
                                        return <TableRow key={c.id}>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-semibold">{c.code}</span>
                                                        <Badge variant={s.variant}>{s.label}</Badge>
                                                    </div>
                                                    {
                                                        c.description && <span className="text-xs text-muted-foreground">{c.description}</span>
                                                    }
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{value(c)}</TableCell>
                                            <TableCell className="text-xs">
                                                {c.starts_at || c.ends_at ? `${c.starts_at ? formatDate(c.starts_at) : "Now"} – ${c.ends_at ? formatDate(new Date(new Date(c.ends_at).getTime() - 1).toISOString()) : "No end"}` : "Always"}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {[
                                                    c.max_uses && `${c.max_uses} total`,
                                                    c.max_uses_per_client && `${c.max_uses_per_client} per client`,
                                                    c.min_subtotal > 0 && `min ${formatMoney(c.min_subtotal)}`,
                                                ].filter(Boolean).join(" · ") || "None"}
                                            </TableCell>
                                            <TableCell className="text-right">{c.uses}</TableCell>
                                            <TableCell className="text-right">{formatMoney(c.total_discount)}</TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    <CouponDialog
                                                        coupon={c}
                                                        trigger={
                                                            <Button size="icon-sm" variant="ghost" aria-label="Edit">
                                                                <PencilIcon />
                                                            </Button>
                                                        }
                                                    />
                                                    {
                                                        c.uses === 0 && <ConfirmButton
                                                            trigger={
                                                                <Button size="icon-sm" variant="ghost" aria-label="Delete">
                                                                    <Trash2Icon />
                                                                </Button>
                                                            }
                                                            title={`Delete ${c.code}?`}
                                                            description="The code stops working. Used coupons cannot be deleted; deactivate them instead."
                                                            confirmLabel="Delete"
                                                            destructive
                                                            onConfirm={() => remove.mutateAsync(c.id)}
                                                        />
                                                    }
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    })
                                }
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            }
        </div>
    )
}
