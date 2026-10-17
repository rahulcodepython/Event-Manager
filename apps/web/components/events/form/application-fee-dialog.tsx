"use client"

import * as React from "react"
import Link from "next/link"
import { IndianRupee, Loader2 } from "lucide-react"

import { Button } from "../../ui/button"
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../ui/dialog"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { formatMoney } from "../../../lib/money"
import { useApplicationFeeQuery, useSetApplicationFeeMutation } from "../../../query-hooks/payouts.api"

interface ApplicationFeeDialogProps {
    eventId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

/** Sets the fee applicants pay to register (0 = free). */
export function ApplicationFeeDialog({ eventId, open, onOpenChange }: ApplicationFeeDialogProps) {
    const { data, isLoading } = useApplicationFeeQuery(eventId)
    const save = useSetApplicationFeeMutation(eventId)
    const [rupees, setRupees] = React.useState<string | null>(null)
    const value = rupees ?? (data ? String(data.fee / 100) : "")
    const paise = Math.round(Number(value || 0) * 100)
    const invalid = !Number.isFinite(paise) || paise < 0 || (paise > 0 && paise < 100)
    const blocked = paise > 0 && !data?.payout_active

    const handleOpenChange = (next: boolean) => {
        if (!next) setRupees(null)
        onOpenChange(next)
    }

    const handleSave = async () => {
        try {
            await save.mutateAsync(paise)
            handleOpenChange(false)
        } catch {
            // Handled by mutation toast
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Application fee</DialogTitle>
                    <DialogDescription>
                        Applicants pay this to register. Razorpay&apos;s fee and the platform fee are deducted before it reaches your bank account.
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-3">
                    {
                        isLoading ? <div className="flex h-16 items-center justify-center">
                            <Loader2 className="size-5 animate-spin text-primary" />
                        </div> : <>
                            <div className="space-y-2">
                                <Label htmlFor="application-fee">Fee (₹)</Label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="application-fee"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        inputMode="decimal"
                                        value={value}
                                        onChange={(e) => setRupees(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {paise > 0 ? `Applicants pay ${formatMoney(paise, data?.currency)}.` : "0 makes registration free."} The minimum fee is ₹1.
                                </p>
                            </div>
                            {
                                blocked && <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                                    Set up an active payout account before charging a fee.{" "}
                                    <Link href="/dashboard/payouts" className="font-medium text-primary hover:underline">Set up payouts</Link>
                                </p>
                            }
                        </>
                    }
                </DialogBody>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={save.isPending || isLoading || invalid || blocked} className="gap-1.5">
                        {
                            save.isPending && <Loader2 className="size-4 animate-spin" />
                        }
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
