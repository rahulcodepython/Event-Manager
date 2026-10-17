"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "../ui/button"
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Switch } from "../ui/switch"
import { Textarea } from "../ui/textarea"
import { today } from "../../lib/format"
import { toPaise, toRupees } from "../../lib/money"
import { useCategoriesQuery } from "../../query-hooks/ledger.api"
import { useCreateSubscriptionMutation, useUpdateSubscriptionMutation } from "../../query-hooks/subscriptions.api"
import {
    SubscriptionFormSchema,
    type Subscription,
    type SubscriptionFormValues,
} from "../../schema/subscriptions.types"

const NO_CATEGORY = "none"
const INTERVAL_ITEMS = [
    { value: "1", label: "Monthly" },
    { value: "3", label: "Every 3 months" },
    { value: "6", label: "Every 6 months" },
    { value: "12", label: "Yearly" },
    { value: "24", label: "Every 2 years" },
]

function defaults(s?: Subscription): SubscriptionFormValues {
    return {
        name: s?.name ?? "",
        vendor: s?.vendor ?? "",
        amount: s ? toRupees(s.amount) : 0,
        interval_months: s?.interval_months ?? 1,
        next_due_on: s?.next_due_on ?? today(),
        category_id: s?.category?.id ?? NO_CATEGORY,
        is_active: s?.is_active ?? true,
        notes: s?.notes ?? "",
    }
}

/** Adds a subscription, or edits one when `subscription` is given. */
export function SubscriptionDialog({ subscription, trigger }: { subscription?: Subscription, trigger: React.ReactElement }) {
    const [open, setOpen] = React.useState(false)
    const { data: categories = [] } = useCategoriesQuery()
    const create = useCreateSubscriptionMutation()
    const update = useUpdateSubscriptionMutation()
    const pending = create.isPending || update.isPending

    const form = useForm<SubscriptionFormValues>({
        resolver: zodResolver(SubscriptionFormSchema),
        defaultValues: defaults(subscription),
    })
    const categoryItems = [
        { value: NO_CATEGORY, label: "No category" },
        ...categories.filter((c) => c.kind === "expense").map((c) => ({ value: c.id, label: c.name })),
    ]

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) form.reset(defaults(subscription))
    }

    const onSubmit = async (values: SubscriptionFormValues) => {
        const data = {
            ...values,
            amount: toPaise(values.amount),
            category_id: values.category_id === NO_CATEGORY ? null : values.category_id,
        }
        try {
            if (subscription) {
                await update.mutateAsync({ id: subscription.id, data })
            } else {
                await create.mutateAsync(data)
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
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
                        <DialogHeader>
                            <DialogTitle>{subscription ? "Edit subscription" : "Add subscription"}</DialogTitle>
                        </DialogHeader>
                        <DialogBody className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Name *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. VPS" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    }
                                />
                                <FormField
                                    control={form.control}
                                    name="vendor"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Vendor</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Hetzner" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    }
                                />
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Amount (₹) *</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" min="0" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    }
                                />
                                <FormField
                                    control={form.control}
                                    name="interval_months"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Renews</FormLabel>
                                            <Select
                                                value={String(field.value)}
                                                items={INTERVAL_ITEMS}
                                                onValueChange={(v) => v !== null && field.onChange(Number(v))}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {
                                                        INTERVAL_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>
                                                            {i.label}
                                                        </SelectItem>)
                                                    }
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    }
                                />
                                <FormField
                                    control={form.control}
                                    name="next_due_on"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Next due *</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    }
                                />
                                <FormField
                                    control={form.control}
                                    name="category_id"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            <Select value={field.value} items={categoryItems} onValueChange={(v) => field.onChange(v ?? NO_CATEGORY)}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {
                                                        categoryItems.map((c) => <SelectItem key={c.value} value={c.value}>
                                                            {c.label}
                                                        </SelectItem>)
                                                    }
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    }
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="notes"
                                render={
                                    ({ field }) => <FormItem>
                                        <FormLabel>Notes</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Plan, account email..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                }
                            />
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={
                                    ({ field }) => <FormItem className="flex flex-row items-center justify-between gap-2 rounded-md border p-3">
                                        <div className="flex flex-col gap-0.5">
                                            <FormLabel>Active</FormLabel>
                                            <span className="text-xs text-muted-foreground">Inactive subscriptions are never due.</span>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                }
                            />
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
                </Form>
            </DialogContent>
        </Dialog>
    )
}
