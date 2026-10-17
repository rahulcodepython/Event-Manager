"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Switch } from "../ui/switch"
import { toPaise, toRupees } from "../../lib/money"
import { useCreateCouponMutation, useUpdateCouponMutation } from "../../query-hooks/coupons.api"
import type { Coupon, CouponInput } from "../../schema/coupons.types"

const KIND_ITEMS = [
    { value: "percent", label: "Percent off" },
    { value: "flat", label: "Fixed amount off" },
]

// Form state keeps strings so fields can be empty ("no limit").
type FormState = {
    code: string
    description: string
    kind: "percent" | "flat"
    percent: string
    amount: string
    maxDiscount: string
    minSubtotal: string
    startsOn: string
    endsOn: string
    maxUses: string
    maxUsesPerClient: string
    isActive: boolean
}

const day = (iso: string | null) => {
    if (!iso) return ""
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toForm(c?: Coupon): FormState {
    // ends_at is stored as the start of the day after the last valid day.
    const endsOn = c?.ends_at ? day(new Date(new Date(c.ends_at).getTime() - 1).toISOString()) : ""
    return {
        code: c?.code ?? "",
        description: c?.description ?? "",
        kind: c?.kind ?? "percent",
        percent: c?.percent_bp ? String(c.percent_bp / 100) : "",
        amount: c?.amount ? String(toRupees(c.amount)) : "",
        maxDiscount: c?.max_discount ? String(toRupees(c.max_discount)) : "",
        minSubtotal: c?.min_subtotal ? String(toRupees(c.min_subtotal)) : "",
        startsOn: day(c?.starts_at ?? null),
        endsOn,
        maxUses: c?.max_uses ? String(c.max_uses) : "",
        maxUsesPerClient: c?.max_uses_per_client ? String(c.max_uses_per_client) : "",
        isActive: c?.is_active ?? true,
    }
}

const num = (v: string) => (v.trim() === "" ? null : Number(v))

function toInput(f: FormState): CouponInput {
    const endsAt = f.endsOn ? new Date(`${f.endsOn}T00:00:00`) : null
    endsAt?.setDate(endsAt.getDate() + 1)
    return {
        code: f.code,
        description: f.description,
        kind: f.kind,
        percent_bp: f.kind === "percent" && f.percent ? Math.round(Number(f.percent) * 100) : null,
        amount: f.kind === "flat" && f.amount ? toPaise(Number(f.amount)) : null,
        max_discount: f.kind === "percent" && f.maxDiscount ? toPaise(Number(f.maxDiscount)) : null,
        min_subtotal: f.minSubtotal ? toPaise(Number(f.minSubtotal)) : 0,
        starts_at: f.startsOn ? new Date(`${f.startsOn}T00:00:00`).toISOString() : null,
        ends_at: endsAt ? endsAt.toISOString() : null,
        max_uses: num(f.maxUses),
        max_uses_per_client: num(f.maxUsesPerClient),
        is_active: f.isActive,
    }
}

/** Creates a coupon, or edits one when `coupon` is given. */
export function CouponDialog({ coupon, trigger }: { coupon?: Coupon, trigger: React.ReactElement }) {
    const [open, setOpen] = React.useState(false)
    const [form, setForm] = React.useState<FormState>(() => toForm(coupon))
    const create = useCreateCouponMutation()
    const update = useUpdateCouponMutation()
    const pending = create.isPending || update.isPending

    const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) setForm(toForm(coupon))
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (coupon) {
                await update.mutateAsync({ id: coupon.id, data: toInput(form) })
            } else {
                await create.mutateAsync(toInput(form))
            }
            setOpen(false)
        } catch {
            // Mutation toasts its own error
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={submit} className="flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{coupon ? "Edit coupon" : "New coupon"}</DialogTitle>
                        <DialogDescription>
                            The discount comes off the subtotal; GST is charged on what is left. Leave limits empty for no limit.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogBody className="grid max-h-[70vh] gap-4 overflow-y-auto sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="c-code">Code</Label>
                            <Input id="c-code" required className="uppercase" placeholder="SAVE20" value={form.code} onChange={set("code")} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Type</Label>
                            <Select
                                value={form.kind}
                                items={KIND_ITEMS}
                                onValueChange={(v) => v && setForm((p) => ({ ...p, kind: v as FormState["kind"] }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {
                                        KIND_ITEMS.map((k) => <SelectItem key={k.value} value={k.value}>
                                            {k.label}
                                        </SelectItem>)
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                        {
                            form.kind === "percent" ? <>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="c-percent">Percent off</Label>
                                    <Input id="c-percent" type="number" min="0.01" max="100" step="0.01" required value={form.percent} onChange={set("percent")} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="c-cap">Max discount (₹)</Label>
                                    <Input id="c-cap" type="number" min="0" step="0.01" placeholder="No cap" value={form.maxDiscount} onChange={set("maxDiscount")} />
                                </div>
                            </> : <div className="flex flex-col gap-2 sm:col-span-2">
                                <Label htmlFor="c-amount">Amount off (₹)</Label>
                                <Input id="c-amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={set("amount")} />
                            </div>
                        }
                        <div className="flex flex-col gap-2 sm:col-span-2">
                            <Label htmlFor="c-desc">Description</Label>
                            <Input id="c-desc" placeholder="Shown to the client" value={form.description} onChange={set("description")} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="c-start">Valid from</Label>
                            <Input id="c-start" type="date" value={form.startsOn} onChange={set("startsOn")} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="c-end">Valid until (inclusive)</Label>
                            <Input id="c-end" type="date" value={form.endsOn} onChange={set("endsOn")} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="c-uses">Total uses</Label>
                            <Input id="c-uses" type="number" min="1" placeholder="No limit" value={form.maxUses} onChange={set("maxUses")} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="c-client">Uses per client</Label>
                            <Input id="c-client" type="number" min="1" placeholder="No limit" value={form.maxUsesPerClient} onChange={set("maxUsesPerClient")} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="c-min">Minimum order (₹, before tax)</Label>
                            <Input id="c-min" type="number" min="0" step="0.01" placeholder="None" value={form.minSubtotal} onChange={set("minSubtotal")} />
                        </div>
                        <label className="flex items-center gap-2 self-end pb-2 text-sm">
                            <Switch checked={form.isActive} onCheckedChange={(isActive) => setForm((p) => ({ ...p, isActive }))} />
                            Active
                        </label>
                    </DialogBody>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={pending} className="gap-2">
                            {
                                pending && <Loader2 className="size-4 animate-spin" />
                            }
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
