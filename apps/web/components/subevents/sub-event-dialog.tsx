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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { Input } from "../ui/input"
import { Switch } from "../ui/switch"
import { Textarea } from "../ui/textarea"
import { useCreateSubEventMutation, useUpdateSubEventMutation } from "../../query-hooks/subevents.api"
import { SubEventFormSchema, type SubEvent, type SubEventFormValues } from "../../schema/subevents.types"

function defaults(s?: SubEvent): SubEventFormValues {
    return {
        name: s?.name ?? "",
        description: s?.description ?? "",
        venue: s?.venue ?? "",
        capacity: s?.capacity ? String(s.capacity) : "",
        link_enabled: s?.link_enabled ?? false,
    }
}

/** Creates a sub-event, or edits one when `subEvent` is given. */
export function SubEventDialog({ eventId, subEvent, trigger, onCreated }: {
    eventId: string
    subEvent?: SubEvent
    trigger: React.ReactElement
    onCreated?: (subEvent: SubEvent) => void
}) {
    const [open, setOpen] = React.useState(false)
    const create = useCreateSubEventMutation(eventId)
    const update = useUpdateSubEventMutation(eventId)
    const pending = create.isPending || update.isPending

    const form = useForm<SubEventFormValues>({
        resolver: zodResolver(SubEventFormSchema),
        defaultValues: defaults(subEvent),
    })

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) form.reset(defaults(subEvent))
    }

    const onSubmit = async (values: SubEventFormValues) => {
        const data = { ...values, capacity: values.capacity === "" ? null : Number(values.capacity) }
        try {
            if (subEvent) {
                await update.mutateAsync({ id: subEvent.id, data })
            } else {
                const created = await create.mutateAsync(data)
                onCreated?.(created)
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
                            <DialogTitle>{subEvent ? "Edit sub-event" : "New sub-event"}</DialogTitle>
                            <DialogDescription>Set its days and hours after saving.</DialogDescription>
                        </DialogHeader>
                        <DialogBody className="flex flex-col gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={
                                    ({ field }) => <FormItem>
                                        <FormLabel>Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. AI Workshop" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                }
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="venue"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Venue</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Hall A" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    }
                                />
                                <FormField
                                    control={form.control}
                                    name="capacity"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Capacity</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" placeholder="No cap" {...field} />
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
                                            <Textarea placeholder="Shown on the registration form" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                }
                            />
                            <FormField
                                control={form.control}
                                name="link_enabled"
                                render={
                                    ({ field }) => <FormItem className="flex flex-row items-center justify-between gap-2 rounded-md border p-3">
                                        <div className="flex flex-col gap-0.5">
                                            <FormLabel>Public link</FormLabel>
                                            <span className="text-xs text-muted-foreground">
                                                The event form with this sub-event fixed. Someone already registered is just enrolled.
                                            </span>
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
