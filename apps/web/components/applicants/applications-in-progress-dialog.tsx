"use client"

import { Loader2 } from "lucide-react"

import { Badge } from "../ui/badge"
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog"
import { formatMoney } from "../../lib/money"
import { useEventDraftsQuery } from "../../query-hooks/payouts.api"
import type { OrganizerDraft } from "../../schema/payouts.types"

const STATUS: Record<OrganizerDraft["status"], { label: string, variant: "outline" | "secondary" | "default" | "destructive" }> = {
    draft: { label: "Filling in", variant: "outline" },
    awaiting_payment: { label: "Paying", variant: "secondary" },
    confirmed: { label: "Registered", variant: "default" },
    refunded: { label: "Refunded", variant: "destructive" },
}

/** Applicants who started but have not registered, are paying, or were refunded. */
export function ApplicationsInProgressDialog({ eventId, open, onOpenChange }: {
    eventId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const { data, isLoading, isError, error } = useEventDraftsQuery(eventId, open)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Applications in progress</DialogTitle>
                    <DialogDescription>
                        Applicants who signed in but have not registered yet, and refunded applications.
                    </DialogDescription>
                </DialogHeader>
                <DialogBody>
                    {
                        isLoading ? <div className="flex h-24 items-center justify-center">
                            <Loader2 className="size-5 animate-spin text-primary" />
                        </div> : isError ? <p className="text-sm text-destructive">{error?.message}</p> : (data ?? []).length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">
                            No applications in progress.
                        </p> : <div className="divide-y rounded-md border">
                            {
                                (data ?? []).map((d) => <div key={d.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                                    <div className="flex min-w-0 flex-col">
                                        <span className="truncate font-medium">{d.name || d.email}</span>
                                        <span className="truncate text-xs text-muted-foreground">{d.email}</span>
                                        {
                                            d.status === "refunded" && d.refund_reason && <span className="text-xs text-muted-foreground">Reason: {d.refund_reason}</span>
                                        }
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <Badge variant={STATUS[d.status].variant}>{STATUS[d.status].label}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {
                                                d.amount ? `${formatMoney(d.amount)} · ` : ""
                                            }
                                            {new Date(d.updated_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>)
                            }
                        </div>
                    }
                </DialogBody>
            </DialogContent>
        </Dialog>
    )
}
