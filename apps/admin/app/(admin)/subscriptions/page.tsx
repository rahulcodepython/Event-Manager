"use client"

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { ConfirmButton } from "../../../components/generic/confirm-button"
import { PageHeader } from "../../../components/generic/page-header"
import { PageLoader } from "../../../components/generic/page-loader"
import { RenewDialog } from "../../../components/subscriptions/renew-dialog"
import { SubscriptionDialog } from "../../../components/subscriptions/subscription-dialog"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Card, CardContent } from "../../../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table"
import { useBreadcrumbs } from "../../../hooks/use-breadcrumbs"
import { formatDate } from "../../../lib/format"
import { formatMoney } from "../../../lib/money"
import { useDeleteSubscriptionMutation, useSubscriptionsQuery } from "../../../query-hooks/subscriptions.api"
import type { Subscription } from "../../../schema/subscriptions.types"

const STATUS: Record<Subscription["status"], { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
    overdue: { label: "Overdue", variant: "destructive" },
    due: { label: "Due soon", variant: "default" },
    upcoming: { label: "Upcoming", variant: "secondary" },
    inactive: { label: "Inactive", variant: "outline" },
}

function interval(months: number) {
    if (months === 1) return "Monthly"
    if (months === 12) return "Yearly"
    return `Every ${months} months`
}

export default function SubscriptionsPage() {
    const { data: subscriptions, isLoading } = useSubscriptionsQuery()
    const remove = useDeleteSubscriptionMutation()

    useBreadcrumbs([{ title: "Subscriptions" }])

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader
                title="Subscriptions"
                description="Your own recurring costs. Confirm each renewal to record it as an expense."
                actions={
                    <SubscriptionDialog trigger={
                        <Button className="gap-2">
                            <PlusIcon className="size-4" />
                            Add subscription
                        </Button>
                    } />
                }
            />

            {
                isLoading || !subscriptions ? <PageLoader /> : <Card>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subscription</TableHead>
                                    <TableHead>Renews</TableHead>
                                    <TableHead>Next due</TableHead>
                                    <TableHead>Last renewed</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Spent</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {
                                    subscriptions.length === 0 && <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                            No subscriptions yet.
                                        </TableCell>
                                    </TableRow>
                                }
                                {
                                    subscriptions.map((s) => <TableRow key={s.id}>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{s.name}</span>
                                                    <Badge variant={STATUS[s.status].variant}>{STATUS[s.status].label}</Badge>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {[s.vendor, s.category?.name].filter(Boolean).join(" · ") || "—"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">{interval(s.interval_months)}</TableCell>
                                        <TableCell className="text-xs">{formatDate(s.next_due_on)}</TableCell>
                                        <TableCell className="text-xs">{formatDate(s.last_renewed_on)}</TableCell>
                                        <TableCell className="text-right">{formatMoney(s.amount, s.currency)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{formatMoney(s.total_spent, s.currency)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                {
                                                    s.is_active && <RenewDialog subscription={s} />
                                                }
                                                <SubscriptionDialog
                                                    subscription={s}
                                                    trigger={
                                                        <Button size="icon-sm" variant="ghost" aria-label="Edit">
                                                            <PencilIcon />
                                                        </Button>
                                                    }
                                                />
                                                <ConfirmButton
                                                    trigger={
                                                        <Button size="icon-sm" variant="ghost" aria-label="Delete">
                                                            <Trash2Icon />
                                                        </Button>
                                                    }
                                                    title={`Delete ${s.name}?`}
                                                    description="Recorded renewal expenses stay in the ledger."
                                                    confirmLabel="Delete"
                                                    destructive
                                                    onConfirm={() => remove.mutateAsync(s.id)}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>)
                                }
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            }
        </div>
    )
}
