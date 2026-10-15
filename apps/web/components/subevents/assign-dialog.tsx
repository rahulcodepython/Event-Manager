"use client"

import * as React from "react"
import { Loader2, UserPlusIcon } from "lucide-react"

import { DebouncedInput } from "../generic/debounced-input"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
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
import { useApplicantsInfiniteQuery } from "../../query-hooks/applicants.api"
import { useAssignMutation } from "../../query-hooks/subevents.api"

/** Lets the organizer pick event applicants to enroll in a sub-event. */
export function AssignDialog({ eventId, subEventId, disabled }: { eventId: string, subEventId: string, disabled: boolean }) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [selected, setSelected] = React.useState<Set<string>>(new Set())
    const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useApplicantsInfiniteQuery(eventId, { search })
    const assign = useAssignMutation(eventId, subEventId)

    const applicants = data?.pages.flatMap((p) => p.data) ?? []

    const toggle = (id: string) => setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        return next
    })

    const submit = async () => {
        try {
            await assign.mutateAsync([...selected])
            setSelected(new Set())
            setOpen(false)
        } catch {
            // Mutation toasts its own error
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                <Button className="gap-2" disabled={disabled}>
                    <UserPlusIcon className="size-4" />
                    Add applicants
                </Button>
            } />
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add applicants</DialogTitle>
                    <DialogDescription>Pick from this event&apos;s applicants. The sub-event&apos;s capacity applies.</DialogDescription>
                </DialogHeader>
                <DialogBody className="flex flex-col gap-3">
                    <DebouncedInput onChange={setSearch} placeholder="Search name, email or ID..." />
                    <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                        {
                            isLoading && <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                        }
                        {
                            applicants.map((a) => {
                                const enrolled = a.sub_events.some((s) => s.id === subEventId)
                                return <label
                                    key={a.user_id}
                                    className="flex cursor-pointer items-center gap-3 rounded-md border p-2 text-sm has-disabled:cursor-default has-disabled:opacity-60"
                                >
                                    <Checkbox
                                        checked={enrolled || selected.has(a.user_id)}
                                        disabled={enrolled}
                                        onCheckedChange={() => toggle(a.user_id)}
                                    />
                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate font-medium">{a.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">{a.email}</span>
                                    </div>
                                    {
                                        enrolled && <Badge variant="secondary">Enrolled</Badge>
                                    }
                                </label>
                            })
                        }
                        {
                            hasNextPage && <Button variant="ghost" size="sm" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
                                Load more
                            </Button>
                        }
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={assign.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={selected.size === 0 || assign.isPending} className="gap-2">
                        {
                            assign.isPending && <Loader2 className="size-4 animate-spin" />
                        }
                        Add {selected.size || ""}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
