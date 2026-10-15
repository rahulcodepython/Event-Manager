"use client"

import * as React from "react"
import { Loader2, Undo2Icon } from "lucide-react"

import { Button } from "../ui/button"
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { formatMoney } from "../../lib/money"
import { useRefundPaymentMutation } from "../../query-hooks/clients.api"
import type { ClientPayment } from "../../schema/clients.types"

/** Records a refund already made in the Razorpay dashboard. */
export function RefundDialog({ payment }: { payment: ClientPayment }) {
    const [open, setOpen] = React.useState(false)
    const [note, setNote] = React.useState("")
    const refund = useRefundPaymentMutation()

    const submit = async () => {
        try {
            await refund.mutateAsync({ paymentId: payment.id, note: note.trim() })
            setOpen(false)
            setNote("")
        } catch {
            // Mutation toasts its own error
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                <Button variant="outline" size="sm" className="gap-1.5">
                    <Undo2Icon className="size-3.5" />
                    Refund
                </Button>
            } />
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Mark {formatMoney(payment.amount, payment.currency)} as refunded?</DialogTitle>
                    <DialogDescription>
                        Refund the money in the Razorpay dashboard first. This records the refund and ends the credit &quot;{payment.credit_name}&quot; now: its event becomes read-only and is deleted after its backup days.
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="flex flex-col gap-2">
                    <Label htmlFor="refund-note">Note (optional)</Label>
                    <Textarea id="refund-note" placeholder="Reason or Razorpay refund id" value={note} onChange={(e) => setNote(e.target.value)} />
                </DialogBody>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={refund.isPending}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={submit} disabled={refund.isPending} className="gap-2">
                        {
                            refund.isPending && <Loader2 className="size-4 animate-spin" />
                        }
                        Mark refunded
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
