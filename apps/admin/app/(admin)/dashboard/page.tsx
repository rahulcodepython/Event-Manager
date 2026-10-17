"use client"

import Link from "next/link"
import {
    CalendarCheckIcon,
    CreditCardIcon,
    IndianRupeeIcon,
    TrendingUpIcon,
    UsersIcon,
    WalletIcon,
} from "lucide-react"

import { MoneyChart } from "../../../components/dashboard/money-chart"
import { PageHeader } from "../../../components/generic/page-header"
import { PageLoader } from "../../../components/generic/page-loader"
import { StatCard } from "../../../components/generic/stat-card"
import { Badge } from "../../../components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { useBreadcrumbs } from "../../../hooks/use-breadcrumbs"
import { formatDate } from "../../../lib/format"
import { formatMoney } from "../../../lib/money"
import { useDashboardQuery } from "../../../query-hooks/dashboard.api"

export default function DashboardPage() {
    const { data, isLoading } = useDashboardQuery(12)

    useBreadcrumbs([{ title: "Dashboard" }])

    if (isLoading || !data) {
        return <PageLoader />
    }

    const money = (n: number) => formatMoney(n, data.currency)
    const { counts, this_month: month, all_time: total } = data

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader title="Dashboard" description="Business overview. Revenue is payments minus refunds." />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard
                    title="Revenue this month"
                    value={money(month.revenue)}
                    hint={`${money(total.revenue)} all time`}
                    icon={IndianRupeeIcon}
                />
                <StatCard
                    title="Expenses this month"
                    value={money(month.expenses)}
                    hint={`${money(total.expenses)} all time`}
                    icon={WalletIcon}
                />
                <StatCard
                    title="Profit this month"
                    value={money(month.profit)}
                    hint={`${money(total.profit)} all time`}
                    icon={TrendingUpIcon}
                />
                <StatCard
                    title="Clients"
                    value={counts.clients}
                    hint={`${counts.new_clients} new this month · ${counts.suspended_clients} suspended`}
                    icon={UsersIcon}
                />
                <StatCard
                    title="Credits sold"
                    value={counts.credits_sold}
                    hint={`${counts.credits_granted} granted · ${counts.trials_claimed} trials`}
                    icon={CreditCardIcon}
                />
                <StatCard
                    title="Active events"
                    value={counts.active_events}
                    hint="Events whose credit has not ended"
                    icon={CalendarCheckIcon}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Income vs expenses</CardTitle>
                    <CardDescription>Last 12 months</CardDescription>
                </CardHeader>
                <CardContent>
                    <MoneyChart data={data.monthly} currency={data.currency} />
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Renewals due</CardTitle>
                        <CardDescription>Overdue or due within 7 days</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 text-sm">
                        {
                            data.due_subscriptions.length === 0 && <p className="text-muted-foreground">Nothing due.</p>
                        }
                        {
                            data.due_subscriptions.map((s) => <Link
                                key={s.id}
                                href="/subscriptions"
                                className="flex items-center justify-between gap-2 rounded-md border p-2.5 hover:bg-muted/50"
                            >
                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate font-medium">{s.name}</span>
                                    <span className="text-xs text-muted-foreground">Due {formatDate(s.next_due_on)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {
                                        s.overdue && <Badge variant="destructive">Overdue</Badge>
                                    }
                                    <span className="font-medium">{money(s.amount)}</span>
                                </div>
                            </Link>)
                        }
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Recent payments</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 text-sm">
                        {
                            data.recent_payments.length === 0 && <p className="text-muted-foreground">No payments yet.</p>
                        }
                        {
                            data.recent_payments.map((p) => <Link
                                key={p.id}
                                href={`/clients/${p.organization.id}`}
                                className="flex items-center justify-between gap-2 rounded-md border p-2.5 hover:bg-muted/50"
                            >
                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate font-medium">{p.organization.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">{p.credit_name} · {formatDate(p.paid_at)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {
                                        p.status === "refunded" && <Badge variant="outline">Refunded</Badge>
                                    }
                                    <span className="font-medium">{money(p.amount)}</span>
                                </div>
                            </Link>)
                        }
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
