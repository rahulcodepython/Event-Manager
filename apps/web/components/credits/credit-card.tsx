"use client"

import Link from "next/link"
import { CalendarRangeIcon, PlusIcon } from "lucide-react"

import { RenameCreditDialog } from "./rename-credit-dialog"
import { CreateEventDialog } from "../events/create-event-dialog"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { formatMoney } from "../../lib/money"
import type { Credit } from "../../schema/credits.types"

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

export function CreditCard({ credit }: { credit: Credit }) {
    const isTrial = credit.kind === "trial"
    const isActive = credit.status === "active"
    const kindLabel = { trial: "Free trial", paid: "Paid", granted: "Complimentary" }[credit.kind]
    const statusLabel = { active: "Active", expired: "Expired", revoked: "Refunded" }[credit.status]

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex items-center gap-1">
                        <CardTitle className="truncate text-base">{credit.name}</CardTitle>
                        <RenameCreditDialog credit={credit} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <Badge variant={isTrial ? "outline" : "secondary"}>{kindLabel}</Badge>
                        <Badge variant={isActive ? "default" : "destructive"}>{statusLabel}</Badge>
                    </div>
                </div>
                {
                    credit.kind === "paid" && <span className="shrink-0 text-sm font-semibold">{formatMoney(credit.total, credit.currency)}</span>
                }
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-3 text-sm">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarRangeIcon className="size-3.5" />
                    {formatDate(credit.starts_at)} to {formatDate(credit.ends_at)}
                </p>
                <ul className="flex flex-col gap-1">
                    {
                        credit.features.map((f) => <li key={f.key} className="flex justify-between gap-2">
                            <span className="text-muted-foreground">{f.name}</span>
                            <span>{f.label}</span>
                        </li>)
                    }
                </ul>
                {
                    isTrial && isActive && <p className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
                        Test only: the trial event is deleted when the trial ends.
                    </p>
                }
                {
                    !isActive && credit.event && <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                        Read-only. Event data will be deleted on {formatDate(credit.prune_at)}.
                    </p>
                }
            </CardContent>

            <CardFooter>
                {
                    credit.event ? <Button
                        variant="outline"
                        className="w-full"
                        nativeButton={false}
                        render={<Link href={`/dashboard/events/${credit.event.id}`} />}
                    >
                        Open {credit.event.name}
                    </Button> : isActive ? <CreateEventDialog
                        defaultCreditId={credit.id}
                        trigger={
                            <Button className="w-full gap-2">
                                <PlusIcon className="size-4" />
                                Create event
                            </Button>
                        }
                    /> : <span className="text-xs text-muted-foreground">This credit can no longer be used.</span>
                }
            </CardFooter>
        </Card>
    )
}
