"use client"

import * as React from "react"
import { CheckIcon, Loader2 } from "lucide-react"

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
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { formatDate, today } from "../../lib/format"
import { toPaise, toRupees } from "../../lib/money"
import { useRenewSubscriptionMutation } from "../../query-hooks/subscriptions.api"
import type { Subscription } from "../../schema/subscriptions.types"

/** Confirms a renewal: records the expense and moves the due date forward. */
export function RenewDialog({ subscription }: { subscription: Subscription }) {
    const [open, setOpen] = React.useState(false)
    const [amount, setAmount] = React.useState("")
    const [paidOn, setPaidOn] = React.useState("")
    const renew = useRenewSubscriptionMutation()

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) {
            setAmount(String(toRupees(subscription.amount)))
            setPaidOn(today())
        }
    }

    const submit = async () => {
        const rupees = Number(amount)
        if (!(rupees > 0) || !paidOn) return
        try {
            await renew.mutateAsync({ id: subscription.id, data: { amount: toPaise(rupees), paid_on: paidOn } })
            setOpen(false)
        } catch {
            // Mutation toasts its own error
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={
                <Button size="sm" className="gap-1.5">
                    <CheckIcon className="size-3.5" />
                    Renewed
                </Button>
            } />
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirm renewal of {subscription.name}</DialogTitle>
                    <DialogDescription>
                        Records the expense and moves the due date from {formatDate(subscription.next_due_on)} forward by {subscription.interval_months} month(s).
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="renew-amount">Amount paid (₹)</Label>
                        <Input id="renew-amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="renew-date">Paid on</Label>
                        <Input id="renew-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={renew.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={renew.isPending || !(Number(amount) > 0) || !paidOn} className="gap-2">
                        {
                            renew.isPending && <Loader2 className="size-4 animate-spin" />
                        }
                        Record renewal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
