"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { DebouncedInput } from "../../../components/generic/debounced-input"
import { PageHeader } from "../../../components/generic/page-header"
import { PageLoader } from "../../../components/generic/page-loader"
import { Pagination } from "../../../components/generic/pagination"
import { Badge } from "../../../components/ui/badge"
import { Card, CardContent } from "../../../components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table"
import { useBreadcrumbs } from "../../../hooks/use-breadcrumbs"
import { formatDate } from "../../../lib/format"
import { formatMoney } from "../../../lib/money"
import { useClientsQuery } from "../../../query-hooks/clients.api"

const STATUS_ITEMS = [
    { value: "all", label: "All clients" },
    { value: "active", label: "Active" },
    { value: "suspended", label: "Suspended" },
]

export default function ClientsPage() {
    const router = useRouter()
    const [search, setSearch] = React.useState("")
    const [status, setStatus] = React.useState("all")
    const [page, setPage] = React.useState(1)

    useBreadcrumbs([{ title: "Clients" }])

    const { data, isLoading } = useClientsQuery({ search, status: status === "all" ? "" : status, page })

    const onSearch = React.useCallback((value: string) => {
        setSearch(value)
        setPage(1)
    }, [])

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader title="Clients" description="Organizations that signed up, with their credits, events and payments." />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <DebouncedInput value={search} onChange={onSearch} placeholder="Search name or email..." />
                <Select
                    value={status}
                    items={STATUS_ITEMS}
                    onValueChange={(v) => {
                        setStatus(v ?? "all")
                        setPage(1)
                    }}
                >
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {
                            STATUS_ITEMS.map((s) => <SelectItem key={s.value} value={s.value}>
                                {s.label}
                            </SelectItem>)
                        }
                    </SelectContent>
                </Select>
            </div>

            {
                isLoading || !data ? <PageLoader /> : <Card>
                    <CardContent className="flex flex-col gap-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead className="text-right">Credits</TableHead>
                                    <TableHead className="text-right">Events</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                    <TableHead>Joined</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {
                                    data.data.length === 0 && <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            No clients found.
                                        </TableCell>
                                    </TableRow>
                                }
                                {
                                    data.data.map((c) => <TableRow
                                        key={c.id}
                                        className="cursor-pointer"
                                        onClick={() => router.push(`/clients/${c.id}`)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{c.name}</span>
                                                {
                                                    c.suspended_at && <Badge variant="destructive">Suspended</Badge>
                                                }
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{c.owner.name}</span>
                                                <span className="text-xs text-muted-foreground">{c.owner.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{c.credits}</TableCell>
                                        <TableCell className="text-right">{c.events}</TableCell>
                                        <TableCell className="text-right">{formatMoney(c.revenue)}</TableCell>
                                        <TableCell>{formatDate(c.created_at)}</TableCell>
                                    </TableRow>)
                                }
                            </TableBody>
                        </Table>
                        <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
                    </CardContent>
                </Card>
            }
        </div>
    )
}
