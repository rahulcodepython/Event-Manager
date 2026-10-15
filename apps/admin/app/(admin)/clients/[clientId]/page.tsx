"use client"

import type { ReactNode } from "react"
import { useParams } from "next/navigation"
import { BanIcon, RotateCcwIcon, ShieldCheckIcon } from "lucide-react"

import { GrantCreditDialog } from "../../../../components/clients/grant-credit-dialog"
import { RefundDialog } from "../../../../components/clients/refund-dialog"
import { ConfirmButton } from "../../../../components/generic/confirm-button"
import { PageHeader } from "../../../../components/generic/page-header"
import { PageLoader } from "../../../../components/generic/page-loader"
import { Badge } from "../../../../components/ui/badge"
import { Button } from "../../../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs"
import { useBreadcrumbs } from "../../../../hooks/use-breadcrumbs"
import { formatDate } from "../../../../lib/format"
import { formatMoney } from "../../../../lib/money"
import { useClientQuery, useResetTrialMutation, useSuspendClientMutation } from "../../../../query-hooks/clients.api"
import type { ClientCredit } from "../../../../schema/clients.types"

const KIND_LABEL: Record<ClientCredit["kind"], string> = { trial: "Trial", paid: "Paid", granted: "Granted" }
const STATUS_VARIANT: Record<ClientCredit["status"], "default" | "secondary" | "destructive"> = {
    active: "default",
    expired: "secondary",
    revoked: "destructive",
}

function Detail({ label, value }: { label: string, value: ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value}</span>
        </div>
    )
}

function Empty({ cols, text }: { cols: number, text: string }) {
    return (
        <TableRow>
            <TableCell colSpan={cols} className="py-8 text-center text-muted-foreground">{text}</TableCell>
        </TableRow>
    )
}

export default function ClientDetailPage() {
    const { clientId } = useParams<{ clientId: string }>()
    const { data: client, isLoading } = useClientQuery(clientId)
    const suspend = useSuspendClientMutation(clientId)
    const resetTrial = useResetTrialMutation(clientId)

    useBreadcrumbs([
        { title: "Clients", url: "/clients" },
        { title: client?.name ?? "Client" },
    ])

    if (isLoading || !client) {
        return <PageLoader />
    }

    const suspended = Boolean(client.suspended_at)

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader
                title={client.name}
                description={`${client.owner.name} · ${client.owner.email}`}
                badge={
                    suspended ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="secondary">Active</Badge>
                }
                actions={
                    <>
                        <GrantCreditDialog clientId={client.id} />
                        {
                            client.trial_choice && <ConfirmButton
                                trigger={
                                    <Button variant="outline" className="gap-2">
                                        <RotateCcwIcon className="size-4" />
                                        Reset trial
                                    </Button>
                                }
                                title="Reset the free trial?"
                                description="The client sees the free-trial step again and can claim a new trial credit. Existing credits are kept."
                                confirmLabel="Reset trial"
                                onConfirm={() => resetTrial.mutateAsync()}
                            />
                        }
                        {
                            suspended ? <ConfirmButton
                                trigger={
                                    <Button variant="outline" className="gap-2">
                                        <ShieldCheckIcon className="size-4" />
                                        Restore
                                    </Button>
                                }
                                title="Restore this client?"
                                description="The client can log in again and their public forms and scanners work again."
                                confirmLabel="Restore"
                                onConfirm={() => suspend.mutateAsync(false)}
                            /> : <ConfirmButton
                                trigger={
                                    <Button variant="destructive" className="gap-2">
                                        <BanIcon className="size-4" />
                                        Suspend
                                    </Button>
                                }
                                title="Suspend this client?"
                                description="The client is logged out and cannot log in. Their public forms close and scanners stop working. Nothing is deleted."
                                confirmLabel="Suspend"
                                destructive
                                onConfirm={() => suspend.mutateAsync(true)}
                            />
                        }
                    </>
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Organization</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Phone" value={client.phone || "—"} />
                    <Detail label="Joined" value={formatDate(client.created_at)} />
                    <Detail label="Free trial" value={client.trial_choice ?? "Not decided"} />
                    <Detail label="Revenue" value={formatMoney(client.revenue)} />
                    {
                        suspended && <Detail label="Suspended" value={formatDate(client.suspended_at)} />
                    }
                </CardContent>
            </Card>

            <Tabs defaultValue="credits">
                <TabsList>
                    <TabsTrigger value="credits">Credits ({client.credit_list.length})</TabsTrigger>
                    <TabsTrigger value="events">Events ({client.event_list.length})</TabsTrigger>
                    <TabsTrigger value="payments">Payments ({client.payment_list.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="credits">
                    <Card>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Credit</TableHead>
                                        <TableHead>Features</TableHead>
                                        <TableHead>Valid</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {
                                        client.credit_list.length === 0 && <Empty cols={5} text="No credits." />
                                    }
                                    {
                                        client.credit_list.map((c) => <TableRow key={c.id}>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium">{c.name}</span>
                                                    <div className="flex gap-1">
                                                        <Badge variant="outline">{KIND_LABEL[c.kind]}</Badge>
                                                        <Badge variant={STATUS_VARIANT[c.status]} className="capitalize">{c.status}</Badge>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {c.features.map((f) => `${f.name}: ${f.label}`).join(" · ")}
                                            </TableCell>
                                            <TableCell className="text-xs">{formatDate(c.starts_at)} to {formatDate(c.ends_at)}</TableCell>
                                            <TableCell className="text-xs">{c.event?.name ?? "—"}</TableCell>
                                            <TableCell className="text-right">{formatMoney(c.total, c.currency)}</TableCell>
                                        </TableRow>)
                                    }
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="events">
                    <Card>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Credit</TableHead>
                                        <TableHead className="text-right">Applicants</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {
                                        client.event_list.length === 0 && <Empty cols={4} text="No events." />
                                    }
                                    {
                                        client.event_list.map((e) => <TableRow key={e.id}>
                                            <TableCell className="font-medium">{e.name}</TableCell>
                                            <TableCell className="text-xs">{formatDate(e.start_date)} to {formatDate(e.end_date)}</TableCell>
                                            <TableCell className="text-xs">{e.credit.name}</TableCell>
                                            <TableCell className="text-right">{e.applicants}</TableCell>
                                        </TableRow>)
                                    }
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments">
                    <Card>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Credit</TableHead>
                                        <TableHead>Razorpay</TableHead>
                                        <TableHead>Paid</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-right" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {
                                        client.payment_list.length === 0 && <Empty cols={5} text="No payments." />
                                    }
                                    {
                                        client.payment_list.map((p) => <TableRow key={p.id}>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium">{p.credit_name}</span>
                                                    {
                                                        p.status === "refunded" && <span className="text-xs text-muted-foreground">
                                                            Refunded {formatDate(p.refunded_at)}{p.refund_note ? ` · ${p.refund_note}` : ""}
                                                        </span>
                                                    }
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                <div className="flex flex-col">
                                                    <span>{p.razorpay_payment_id ?? "—"}</span>
                                                    <span className="text-muted-foreground">{p.razorpay_order_id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">{formatDate(p.paid_at)}</TableCell>
                                            <TableCell className="text-right">{formatMoney(p.amount, p.currency)}</TableCell>
                                            <TableCell className="text-right">
                                                {
                                                    p.status === "paid" ? <RefundDialog payment={p} /> : <Badge variant="outline">Refunded</Badge>
                                                }
                                            </TableCell>
                                        </TableRow>)
                                    }
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
