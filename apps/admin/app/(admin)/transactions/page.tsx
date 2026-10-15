"use client"

import * as React from "react"
import Link from "next/link"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { ConfirmButton } from "../../../components/generic/confirm-button"
import { DebouncedInput } from "../../../components/generic/debounced-input"
import { PageHeader } from "../../../components/generic/page-header"
import { PageLoader } from "../../../components/generic/page-loader"
import { Pagination } from "../../../components/generic/pagination"
import { TransactionDialog } from "../../../components/ledger/transaction-dialog"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Input } from "../../../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table"
import { useBreadcrumbs } from "../../../hooks/use-breadcrumbs"
import { formatDate } from "../../../lib/format"
import { formatMoney } from "../../../lib/money"
import { cn } from "../../../lib/utils"
import {
    useCategoriesQuery,
    useDeleteTransactionMutation,
    useTransactionsQuery,
} from "../../../query-hooks/ledger.api"
import type { Transaction, TransactionFilter } from "../../../schema/ledger.types"

const ALL = "all"
const KIND_ITEMS = [
    { value: ALL, label: "All types" },
    { value: "income", label: "Income" },
    { value: "expense", label: "Expense" },
    { value: "refund", label: "Refund" },
]
const SOURCE_ITEMS = [
    { value: ALL, label: "All sources" },
    { value: "payment", label: "Client payments" },
    { value: "manual", label: "Manual" },
    { value: "subscription", label: "Subscriptions" },
]
const SOURCE_LABEL: Record<Transaction["source"], string> = {
    payment: "Payment",
    manual: "Manual",
    subscription: "Subscription",
}

function FilterSelect({ value, items, onChange, className }: {
    value: string
    items: { value: string, label: string }[]
    onChange: (value: string) => void
    className?: string
}) {
    return (
        <Select value={value} items={items} onValueChange={(v) => onChange(v ?? ALL)}>
            <SelectTrigger className={cn("w-40", className)}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {
                    items.map((i) => <SelectItem key={i.value} value={i.value}>
                        {i.label}
                    </SelectItem>)
                }
            </SelectContent>
        </Select>
    )
}

function Total({ label, value, className }: { label: string, value: number, className?: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
                <span className={cn("text-xl font-bold", className)}>{formatMoney(value)}</span>
            </CardContent>
        </Card>
    )
}

export default function TransactionsPage() {
    const [filter, setFilter] = React.useState<TransactionFilter>({
        kind: ALL, source: ALL, category_id: ALL, from: "", to: "", search: "", page: 1,
    })
    const { data: categories = [] } = useCategoriesQuery()
    const remove = useDeleteTransactionMutation()

    useBreadcrumbs([{ title: "Transactions" }])

    // "all" is a UI value; the API reads an empty filter as "any".
    const params = Object.fromEntries(
        Object.entries(filter).map(([k, v]) => [k, v === ALL ? "" : v]),
    ) as TransactionFilter
    const { data, isLoading } = useTransactionsQuery(params)

    const set = (patch: Partial<TransactionFilter>) => setFilter((prev) => ({ ...prev, page: 1, ...patch }))
    const onSearch = React.useCallback((search: string) => setFilter((prev) => ({ ...prev, page: 1, search })), [])
    const categoryItems = [{ value: ALL, label: "All categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader
                title="Transactions"
                description="Client payments and refunds are added automatically. Add other income and expenses here."
                actions={
                    <TransactionDialog trigger={
                        <Button className="gap-2">
                            <PlusIcon className="size-4" />
                            Add entry
                        </Button>
                    } />
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <DebouncedInput value={filter.search} onChange={onSearch} placeholder="Search description..." />
                <FilterSelect value={filter.kind} items={KIND_ITEMS} onChange={(kind) => set({ kind })} />
                <FilterSelect value={filter.source} items={SOURCE_ITEMS} onChange={(source) => set({ source })} />
                <FilterSelect value={filter.category_id} items={categoryItems} onChange={(category_id) => set({ category_id })} className="w-48" />
                <Input type="date" className="w-40" value={filter.from} onChange={(e) => set({ from: e.target.value })} aria-label="From" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" className="w-40" value={filter.to} onChange={(e) => set({ to: e.target.value })} aria-label="To" />
            </div>

            {
                isLoading || !data ? <PageLoader /> : <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Total label="Income" value={data.totals.income} />
                        <Total label="Refunds" value={data.totals.refund} />
                        <Total label="Expenses" value={data.totals.expense} />
                        <Total label="Net" value={data.totals.net} className={data.totals.net < 0 ? "text-destructive" : ""} />
                    </div>

                    <Card>
                        <CardContent className="flex flex-col gap-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {
                                        data.data.length === 0 && <TableRow>
                                            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                                No transactions match.
                                            </TableCell>
                                        </TableRow>
                                    }
                                    {
                                        data.data.map((t) => <TableRow key={t.id}>
                                            <TableCell className="whitespace-nowrap text-xs">{formatDate(t.occurred_on)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{t.description || "—"}</span>
                                                    {
                                                        t.organization && <Link href={`/clients/${t.organization.id}`} className="text-xs text-muted-foreground hover:underline">
                                                            {t.organization.name}
                                                        </Link>
                                                    }
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">{t.category?.name ?? "—"}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{SOURCE_LABEL[t.source]}</Badge>
                                            </TableCell>
                                            <TableCell className={cn("text-right font-medium whitespace-nowrap", t.kind === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                                                {t.kind === "income" ? "+" : "−"}{formatMoney(t.amount, t.currency)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {
                                                        t.source === "manual" && <TransactionDialog
                                                            transaction={t}
                                                            trigger={
                                                                <Button size="icon-sm" variant="ghost" aria-label="Edit">
                                                                    <PencilIcon />
                                                                </Button>
                                                            }
                                                        />
                                                    }
                                                    {
                                                        t.source !== "payment" && <ConfirmButton
                                                            trigger={
                                                                <Button size="icon-sm" variant="ghost" aria-label="Delete">
                                                                    <Trash2Icon />
                                                                </Button>
                                                            }
                                                            title="Delete this entry?"
                                                            description={
                                                                t.source === "subscription" ? "The renewal expense is removed. The subscription's next due date does not change." : "The entry is removed from the ledger."
                                                            }
                                                            confirmLabel="Delete"
                                                            destructive
                                                            onConfirm={() => remove.mutateAsync(t.id)}
                                                        />
                                                    }
                                                </div>
                                            </TableCell>
                                        </TableRow>)
                                    }
                                </TableBody>
                            </Table>
                            <Pagination
                                page={data.page}
                                limit={data.limit}
                                total={data.total}
                                onPage={(page) => setFilter((prev) => ({ ...prev, page }))}
                            />
                        </CardContent>
                    </Card>
                </>
            }
        </div>
    )
}
