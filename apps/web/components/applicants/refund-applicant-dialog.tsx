"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogBody,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../ui/alert-dialog"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { formatMoney } from "../../lib/money"
import { useRefundApplicantMutation } from "../../query-hooks/payouts.api"
import type { ApplicantItem } from "../../schema/applicants.types"

/** Refunds a paid applicant's fee in full and removes them. */
export function RefundApplicantDialog({ eventId, applicant, onOpenChange }: {
    eventId: string
    applicant: ApplicantItem | null
    onOpenChange: (open: boolean) => void
}) {
    const refund = useRefundApplicantMutation(eventId)
    const [reason, setReason] = React.useState("")

    const close = () => {
        setReason("")
        onOpenChange(false)
    }

    const handleRefund = async () => {
        if (!applicant) return
        try {
            await refund.mutateAsync({ applicantId: applicant.user_id, reason: reason.trim() })
            close()
        } catch {
            // Handled by mutation toast
        }
    }

    return (
        <AlertDialog open={!!applicant} onOpenChange={(open) => {
            if (!open) close()
        }}>
            <AlertDialogContent className="sm:max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">Refund and remove</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogBody className="space-y-3">
                    <AlertDialogDescription>
                        Refund {formatMoney(applicant?.paid_amount ?? 0)} to{" "}
                        <span className="font-semibold text-foreground">{applicant?.name}</span> ({applicant?.email})
                        and remove their registration and attendance. They are emailed the reason. Your payout for this fee is reversed.
                    </AlertDialogDescription>
                    <div className="space-y-2">
                        <Label htmlFor="refund-reason">Reason</Label>
                        <Textarea
                            id="refund-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. The event was cancelled"
                            maxLength={500}
                        />
                    </div>
                </AlertDialogBody>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={refund.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleRefund}
                        disabled={refund.isPending || !reason.trim()}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
                    >
                        {
                            refund.isPending && <Loader2 className="size-4 animate-spin" />
                        }
                        <span>Refund</span>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
