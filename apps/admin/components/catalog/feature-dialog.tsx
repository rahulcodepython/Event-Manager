"use client"

import * as React from "react"
import { Loader2, PlusIcon, Trash2Icon } from "lucide-react"

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
import { Textarea } from "../ui/textarea"
import { toPaise, toRupees } from "../../lib/money"
import { useUpdateFeatureMutation } from "../../query-hooks/catalog.api"
import type { Feature } from "../../schema/catalog.types"

const PRICING_ITEMS = [
    { value: "flat", label: "Flat: one price when on" },
    { value: "per_unit", label: "Per unit: price × units" },
    { value: "tiered", label: "Tiered: price of the matching band" },
]

// Form rows keep inputs as strings so fields can be cleared while typing.
type OptionRow = { value: string, label: string, is_active: boolean }
type RateRow = { min_value: string, max_value: string, unit_size: string, price: string }

function toRows(f: Feature) {
    return {
        name: f.name,
        description: f.description,
        unit: f.unit,
        pricing_type: f.pricing_type,
        default_value: String(f.default_value),
        trial_value: String(f.trial_value),
        options: f.options.map((o): OptionRow => ({ value: String(o.value), label: o.label, is_active: o.is_active })),
        rates: f.rates.map((r): RateRow => ({
            min_value: String(r.min_value),
            max_value: r.max_value === null ? "" : String(r.max_value),
            unit_size: String(r.unit_size),
            price: String(toRupees(r.price)),
        })),
    }
}

/** Edits one feature: text, defaults, options and rates, saved together. */
export function FeatureDialog({ feature, trigger }: { feature: Feature, trigger: React.ReactElement }) {
    const [open, setOpen] = React.useState(false)
    const [form, setForm] = React.useState(() => toRows(feature))
    const save = useUpdateFeatureMutation()

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) setForm(toRows(feature))
    }

    const setOption = (i: number, patch: Partial<OptionRow>) =>
        setForm((prev) => ({ ...prev, options: prev.options.map((o, j) => j === i ? { ...o, ...patch } : o) }))
    const setRate = (i: number, patch: Partial<RateRow>) =>
        setForm((prev) => ({ ...prev, rates: prev.rates.map((r, j) => j === i ? { ...r, ...patch } : r) }))

    const defaultItems = form.options
        .filter((o) => o.is_active && o.value !== "")
        .map((o) => ({ value: o.value, label: o.label || o.value }))

    const submit = async () => {
        try {
            await save.mutateAsync({
                id: feature.id,
                data: {
                    name: form.name,
                    description: form.description,
                    unit: form.unit,
                    pricing_type: form.pricing_type,
                    default_value: Number(form.default_value),
                    trial_value: Number(form.trial_value),
                    options: form.options.map((o) => ({ value: Number(o.value), label: o.label, is_active: o.is_active })),
                    rates: form.rates.map((r) => ({
                        min_value: Number(r.min_value),
                        max_value: r.max_value === "" ? null : Number(r.max_value),
                        unit_size: Number(r.unit_size),
                        price: toPaise(Number(r.price)),
                    })),
                },
            })
            setOpen(false)
        } catch {
            // Mutation toasts its own error
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Edit {feature.name}</DialogTitle>
                    <DialogDescription>
                        Key <code className="font-mono">{feature.key}</code> · {feature.value_type === "boolean" ? "on/off (0 or 1)" : "number"}. Changes apply to new purchases only.
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="feature-name">Name</Label>
                            <Input id="feature-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="feature-unit">Unit</Label>
                            <Input id="feature-unit" placeholder="e.g. days" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} />
                        </div>
                        <div className="flex flex-col gap-2 sm:col-span-2">
                            <Label htmlFor="feature-description">Description</Label>
                            <Textarea id="feature-description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Pricing</Label>
                            <Select
                                value={form.pricing_type}
                                items={PRICING_ITEMS}
                                onValueChange={(v) => v && setForm((p) => ({ ...p, pricing_type: v as Feature["pricing_type"] }))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {
                                        PRICING_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>
                                            {i.label}
                                        </SelectItem>)
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-2">
                                <Label>Default</Label>
                                <Select
                                    value={form.default_value}
                                    items={defaultItems}
                                    onValueChange={(v) => v !== null && setForm((p) => ({ ...p, default_value: v }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {
                                            defaultItems.map((i) => <SelectItem key={i.value} value={i.value}>
                                                {i.label}
                                            </SelectItem>)
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="feature-trial">Trial value</Label>
                                <Input id="feature-trial" type="number" min="0" value={form.trial_value} onChange={(e) => setForm((p) => ({ ...p, trial_value: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <Label>Options clients can pick</Label>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => setForm((p) => ({ ...p, options: [...p.options, { value: "", label: "", is_active: true }] }))}
                            >
                                <PlusIcon className="size-3.5" />
                                Option
                            </Button>
                        </div>
                        <div className="grid grid-cols-[6rem_1fr_auto_auto] items-center gap-2 text-xs text-muted-foreground">
                            <span>Value</span>
                            <span>Label</span>
                            <span>Active</span>
                            <span />
                            {
                                form.options.map((o, i) => <React.Fragment key={i}>
                                    <Input type="number" min="0" value={o.value} onChange={(e) => setOption(i, { value: e.target.value })} />
                                    <Input value={o.label} onChange={(e) => setOption(i, { label: e.target.value })} />
                                    <Switch checked={o.is_active} onCheckedChange={(checked) => setOption(i, { is_active: checked })} />
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label="Remove option"
                                        onClick={() => setForm((p) => ({ ...p, options: p.options.filter((_, j) => j !== i) }))}
                                    >
                                        <Trash2Icon />
                                    </Button>
                                </React.Fragment>)
                            }
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <Label>Rates</Label>
                                <span className="text-xs text-muted-foreground">A value with no matching rate is free. Leave max empty for no upper limit.</span>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => setForm((p) => ({ ...p, rates: [...p.rates, { min_value: "0", max_value: "", unit_size: "1", price: "0" }] }))}
                            >
                                <PlusIcon className="size-3.5" />
                                Rate
                            </Button>
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-2 text-xs text-muted-foreground">
                            <span>Min</span>
                            <span>Max</span>
                            <span>Unit size</span>
                            <span>Price (₹)</span>
                            <span />
                            {
                                form.rates.map((r, i) => <React.Fragment key={i}>
                                    <Input type="number" min="0" value={r.min_value} onChange={(e) => setRate(i, { min_value: e.target.value })} />
                                    <Input type="number" min="0" placeholder="No limit" value={r.max_value} onChange={(e) => setRate(i, { max_value: e.target.value })} />
                                    <Input type="number" min="1" value={r.unit_size} onChange={(e) => setRate(i, { unit_size: e.target.value })} />
                                    <Input type="number" min="0" step="0.01" value={r.price} onChange={(e) => setRate(i, { price: e.target.value })} />
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label="Remove rate"
                                        onClick={() => setForm((p) => ({ ...p, rates: p.rates.filter((_, j) => j !== i) }))}
                                    >
                                        <Trash2Icon />
                                    </Button>
                                </React.Fragment>)
                            }
                        </div>
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={save.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={save.isPending} className="gap-2">
                        {
                            save.isPending && <Loader2 className="size-4 animate-spin" />
                        }
                        Save feature
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
