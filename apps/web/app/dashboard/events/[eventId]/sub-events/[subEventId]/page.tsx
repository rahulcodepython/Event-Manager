"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { BarChart3Icon, CopyIcon, Loader2, PencilIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { useEventPage } from "../../../../../../components/events/event-context"
import { ConfirmButton, DebouncedInput, PageHeader } from "../../../../../../components/generic"
import { AssignDialog } from "../../../../../../components/subevents/assign-dialog"
import { DaysEditor } from "../../../../../../components/subevents/days-editor"
import { SubEventDialog } from "../../../../../../components/subevents/sub-event-dialog"
import { Badge } from "../../../../../../components/ui/badge"
import { Button } from "../../../../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../../../components/ui/table"
import { useCardStatusQuery } from "../../../../../../query-hooks/cards.api"
import { useEventFormQuery } from "../../../../../../query-hooks/eventform.api"
import {
    useDeleteSubEventMutation,
    useEnrolledQuery,
    useSubEventsQuery,
    useUnassignMutation,
} from "../../../../../../query-hooks/subevents.api"

export default function SubEventDetailPage() {
    const router = useRouter()
    const { subEventId } = useParams<{ subEventId: string }>()
    const { event, eventId } = useEventPage("Sub-events")
    const { data: overview, isLoading } = useSubEventsQuery(eventId)
    const { data: eventForm } = useEventFormQuery(eventId)
    const { data: cardStatus } = useCardStatusQuery(eventId)
    const [search, setSearch] = React.useState("")
    const [page, setPage] = React.useState(1)
    const { data: enrolled } = useEnrolledQuery(eventId, subEventId, { search, page })
    const remove = useDeleteSubEventMutation(eventId)
    const unassign = useUnassignMutation(eventId, subEventId)

    const locked = Boolean(cardStatus?.is_closed)
    const subEvent = overview?.sub_events.find((s) => s.id === subEventId)

    if (isLoading || !overview) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
            </div>
        )
    }
    if (!subEvent) {
        return <p className="text-sm text-muted-foreground">Sub-event not found.</p>
    }

    const link = eventForm && typeof window !== "undefined" ? `${window.location.origin}/apply/${eventForm.id}?sub=${subEvent.id}` : ""
    const pages = enrolled ? Math.max(1, Math.ceil(enrolled.total / enrolled.limit)) : 1

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader
                title={subEvent.name}
                description={[subEvent.venue, subEvent.description].filter(Boolean).join(" · ") || "Sub-event"}
                badge={<Badge variant="outline">{subEvent.enrolled}{subEvent.capacity ? ` / ${subEvent.capacity}` : ""} enrolled</Badge>}
                actions={
                    <>
                        {
                            subEvent.link_enabled && link && <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => {
                                    navigator.clipboard.writeText(link)
                                    toast.success("Sub-event link copied")
                                }}
                            >
                                <CopyIcon className="size-4" />
                                Copy link
                            </Button>
                        }
                        <Button
                            variant="outline"
                            className="gap-2"
                            nativeButton={false}
                            render={<Link href={`/dashboard/events/${eventId}/analysis?sub=${subEvent.id}`} />}
                        >
                            <BarChart3Icon className="size-4" />
                            Attendance
                        </Button>
                        <SubEventDialog
                            eventId={eventId}
                            subEvent={subEvent}
                            trigger={
                                <Button variant="outline" className="gap-2">
                                    <PencilIcon className="size-4" />
                                    Edit
                                </Button>
                            }
                        />
                        <ConfirmButton
                            trigger={
                                <Button variant="destructive" className="gap-2" disabled={locked}>
                                    <Trash2Icon className="size-4" />
                                    Delete
                                </Button>
                            }
                            title={`Delete ${subEvent.name}?`}
                            description="Its days, enrollments and attendance are deleted. Applicants stay registered for the event."
                            confirmLabel="Delete"
                            destructive
                            onConfirm={async () => {
                                await remove.mutateAsync(subEvent.id)
                                router.push(`/dashboard/events/${eventId}/sub-events`)
                            }}
                        />
                    </>
                }
            />

            <DaysEditor
                key={JSON.stringify(subEvent.days)}
                eventId={eventId}
                subEventId={subEvent.id}
                days={subEvent.days}
                minDate={event.start_date}
                maxDate={event.end_date}
            />

            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex flex-col gap-1.5">
                        <CardTitle className="text-base">Enrolled applicants</CardTitle>
                        <CardDescription>
                            {
                                locked ? "Applications are closed, so enrollment is frozen." : "Only enrolled applicants pass the scanner for this sub-event."
                            }
                        </CardDescription>
                    </div>
                    <AssignDialog eventId={eventId} subEventId={subEvent.id} disabled={locked} />
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <DebouncedInput
                        onChange={(v) => {
                            setSearch(v)
                            setPage(1)
                        }}
                        placeholder="Search enrolled..."
                    />
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Applicant</TableHead>
                                <TableHead>Applicant ID</TableHead>
                                <TableHead>Enrolled</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {
                                enrolled?.data.length === 0 && <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No one enrolled yet.</TableCell>
                                </TableRow>
                            }
                            {
                                enrolled?.data.map((a) => <TableRow key={a.user_id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{a.name}</span>
                                            <span className="text-xs text-muted-foreground">{a.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{a.user_id}</TableCell>
                                    <TableCell className="text-xs">{new Date(a.enrolled_at).toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        {
                                            !locked && <Button
                                                size="icon-sm"
                                                variant="ghost"
                                                aria-label="Remove from sub-event"
                                                disabled={unassign.isPending}
                                                onClick={() => unassign.mutate(a.user_id)}
                                            >
                                                <XIcon />
                                            </Button>
                                        }
                                    </TableCell>
                                </TableRow>)
                            }
                        </TableBody>
                    </Table>
                    {
                        pages > 1 && <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                            <span>Page {page} of {pages}</span>
                            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
                        </div>
                    }
                </CardContent>
            </Card>
        </div>
    )
}
