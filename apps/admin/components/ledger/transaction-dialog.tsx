"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

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
import { today } from "../../lib/format"
import { toPaise, toRupees } from "../../lib/money"
import {
    useCategoriesQuery,
    useCreateTransactionMutation,
    useUpdateTransactionMutation,
} from "../../query-hooks/ledger.api"
import {
    TransactionFormSchema,
    type Transaction,
    type TransactionFormValues,
} from "../../schema/ledger.types"

const KIND_ITEMS = [
    { value: "expense", label: "Expense" },
    { value: "income", label: "Income" },
]
const NO_CATEGORY = "none"

function defaults(t?: Transaction): TransactionFormValues {
    return {
        kind: t?.kind === "income" ? "income" : "expense",
        amount: t ? toRupees(t.amount) : 0,
        description: t?.description ?? "",
        occurred_on: t?.occurred_on ?? today(),
        category_id: t?.category?.id ?? NO_CATEGORY,
    }
}

/** Adds a manual entry, or edits one when `transaction` is given. */
export function TransactionDialog({ transaction, trigger }: { transaction?: Transaction, trigger: React.ReactElement }) {
    const [open, setOpen] = React.useState(false)
    const { data: categories = [] } = useCategoriesQuery()
    const create = useCreateTransactionMutation()
    const update = useUpdateTransactionMutation()
    const pending = create.isPending || update.isPending

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(TransactionFormSchema),
        defaultValues: defaults(transaction),
    })
    const kind = useWatch({ control: form.control, name: "kind" })
    const kindCategories = categories.filter((c) => c.kind === kind)
    const categoryItems = [
        { value: NO_CATEGORY, label: "No category" },
        ...kindCategories.map((c) => ({ value: c.id, label: c.name })),
    ]

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) form.reset(defaults(transaction))
    }

    const onSubmit = async (values: TransactionFormValues) => {
        const data = {
            kind: values.kind,
            amount: toPaise(values.amount),
            description: values.description,
            occurred_on: values.occurred_on,
            category_id: values.category_id === NO_CATEGORY ? null : values.category_id,
        }
        try {
            if (transaction) {
                await update.mutateAsync({ id: transaction.id, data })
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
            <DialogContent className="sm:max-w-md">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
                        <DialogHeader>
                            <DialogTitle>{transaction ? "Edit entry" : "Add entry"}</DialogTitle>
                        </DialogHeader>
                        <DialogBody className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="kind"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select
                                                value={field.value}
                                                items={KIND_ITEMS}
                                                onValueChange={(v) => {
                                                    field.onChange(v ?? "expense")
                                                    form.setValue("category_id", NO_CATEGORY)
                                                }}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {
                                                        KIND_ITEMS.map((k) => <SelectItem key={k.value} value={k.value}>
                                                            {k.label}
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
                            </div>
                            <FormField
                                control={form.control}
                                name="description"
                                render={
                                    ({ field }) => <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Domain renewal" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                }
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="occurred_on"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Date *</FormLabel>
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
