"use client"

import * as React from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useCreditsQuery } from "../../query-hooks/credits.api"
import { useCreateEventMutation } from "../../query-hooks/events.api"
import { useCatalogQuery } from "../../query-hooks/pricing.api"
import { CreateEventSchema, type CreateEventInput } from "../../schema/events.types"

interface CreateEventDialogProps {
    trigger?: React.ReactElement
    /** Pre-selects a credit, e.g. when opened from the credits page. */
    defaultCreditId?: string
}

const toDateInput = (iso: string) => iso.slice(0, 10)

export function CreateEventDialog({ trigger, defaultCreditId }: CreateEventDialogProps) {
    const [open, setOpen] = React.useState(false)
    const createEvent = useCreateEventMutation()
    const { data: credits = [] } = useCreditsQuery()
    const { data: catalog } = useCatalogQuery()

    // Only credits that can start an event now: active and not serving one.
    const available = credits.filter((c) => c.status === "active" && !c.event)

    const form = useForm<CreateEventInput>({
        resolver: zodResolver(CreateEventSchema),
        defaultValues: { credit_id: defaultCreditId ?? "", name: "", start_date: "", end_date: "" },
    })

    const creditId = useWatch({ control: form.control, name: "credit_id" })
    const selected = available.find((c) => c.id === creditId)
    const minDate = selected ? toDateInput(selected.starts_at) : undefined
    const maxDate = selected ? toDateInput(selected.ends_at) : undefined

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (!next) form.reset({ credit_id: defaultCreditId ?? "", name: "", start_date: "", end_date: "" })
    }

    const onSubmit = async (values: CreateEventInput) => {
        try {
            await createEvent.mutateAsync(values)
            handleOpenChange(false)
        } catch {
            // Handled by mutation toast
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={
                trigger ?? <Button className="gap-2">
                    <PlusIcon className="size-4" />
                    <span>Create Event</span>
                </Button>
            } />
            <DialogContent className="sm:max-w-lg">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Create New Event</DialogTitle>
                            <DialogDescription>
                                Every event runs on a credit. Its dates must fit inside the credit&apos;s validity.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogBody>
                            {
                                available.length === 0 ? <div className="flex flex-col items-start gap-3 rounded-md border bg-muted/30 p-4 text-sm">
                                    <span>You have no unused active credit.</span>
                                    <Button nativeButton={false} render={<Link href="/dashboard/credits/new" />}>
                                        Buy a credit
                                    </Button>
                                </div> : <>
                                    <FormField
                                        control={form.control}
                                        name="credit_id"
                                        render={
                                            ({ field }) => <FormItem>
                                                <FormLabel>Credit *</FormLabel>
                                                <Select
                                                    value={field.value}
                                                    items={available.map((c) => ({ label: c.name, value: c.id }))}
                                                    onValueChange={(v) => field.onChange(v ?? "")}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Choose a credit" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {
                                                            available.map((c) => <SelectItem key={c.id} value={c.id}>
                                                                {c.name}
                                                            </SelectItem>)
                                                        }
                                                    </SelectContent>
                                                </Select>
                                                {
                                                    selected && <p className="text-xs text-muted-foreground">
                                                        Valid {minDate} to {maxDate}
                                                        {
                                                            selected.kind === "trial" && catalog && ` · trial events up to ${catalog.trial_max_event_days} days, test only`
                                                        }
                                                    </p>
                                                }
                                                <FormMessage />
                                            </FormItem>
                                        }
                                    />

                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={
                                            ({ field }) => <FormItem>
                                                <FormLabel>Event Name *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Annual Tech Summit" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        }
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField
                                            control={form.control}
                                            name="start_date"
                                            render={
                                                ({ field }) => <FormItem>
                                                    <FormLabel>Start Date *</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" min={minDate} max={maxDate} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            }
                                        />

                                        <FormField
                                            control={form.control}
                                            name="end_date"
                                            render={
                                                ({ field }) => <FormItem>
                                                    <FormLabel>End Date *</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" min={minDate} max={maxDate} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            }
                                        />
                                    </div>
                                </>
                            }
                        </DialogBody>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={createEvent.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createEvent.isPending || available.length === 0}>
                                {createEvent.isPending ? "Creating..." : "Create Event"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
