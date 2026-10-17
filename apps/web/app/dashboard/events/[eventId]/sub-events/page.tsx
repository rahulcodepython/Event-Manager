"use client"

import Link from "next/link"
import { CalendarDaysIcon, LinkIcon, Loader2, MapPinIcon, PlusIcon, UsersIcon } from "lucide-react"

import { useEventPage } from "../../../../../components/events/event-context"
import { PageHeader } from "../../../../../components/generic"
import { SelfEnrollSettings } from "../../../../../components/subevents/self-enroll-settings"
import { SubEventDialog } from "../../../../../components/subevents/sub-event-dialog"
import { Badge } from "../../../../../components/ui/badge"
import { Button } from "../../../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card"
import { daysSummary } from "../../../../../lib/sub-events"
import { useCardStatusQuery } from "../../../../../query-hooks/cards.api"
import { useSubEventsQuery } from "../../../../../query-hooks/subevents.api"

export default function SubEventsPage() {
    const { eventId } = useEventPage("Sub-events")
    const { data: overview, isLoading } = useSubEventsQuery(eventId)
    const { data: cardStatus } = useCardStatusQuery(eventId)
    const locked = Boolean(cardStatus?.is_closed)

    if (isLoading || !overview) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
            </div>
        )
    }

    const count = overview.sub_events.length
    const atLimit = count >= overview.limit

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader
                title="Sub-events"
                description="Workshops, competitions or sessions inside this event, each with its own days, hours and attendance."
                badge={<Badge variant="outline">{count} of {overview.limit} used</Badge>}
                actions={
                    <SubEventDialog
                        eventId={eventId}
                        trigger={
                            <Button className="gap-2" disabled={atLimit}>
                                <PlusIcon className="size-4" />
                                New sub-event
                            </Button>
                        }
                    />
                }
            />

            {
                overview.limit === 0 && <Card>
                    <CardContent className="text-sm text-muted-foreground">
                        This event&apos;s credit does not include sub-events. Choose a credit with sub-events when you create an event.
                    </CardContent>
                </Card>
            }

            <SelfEnrollSettings eventId={eventId} overview={overview} locked={locked} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {
                    overview.sub_events.map((se) => <Link key={se.id} href={`/dashboard/events/${eventId}/sub-events/${se.id}`}>
                        <Card className="h-full transition-colors hover:bg-muted/40">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="truncate text-base">{se.name}</CardTitle>
                                    {
                                        se.link_enabled && <Badge variant="secondary" className="gap-1">
                                            <LinkIcon className="size-3" />
                                            Link
                                        </Badge>
                                    }
                                </div>
                                {
                                    se.description && <CardDescription className="line-clamp-2">{se.description}</CardDescription>
                                }
                            </CardHeader>
                            <CardContent className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    <CalendarDaysIcon className="size-3.5" />
                                    {daysSummary(se.days)}
                                </span>
                                {
                                    se.venue && <span className="flex items-center gap-2">
                                        <MapPinIcon className="size-3.5" />
                                        {se.venue}
                                    </span>
                                }
                                <span className="flex items-center gap-2">
                                    <UsersIcon className="size-3.5" />
                                    {se.enrolled}{se.capacity ? ` / ${se.capacity}` : ""} enrolled
                                </span>
                            </CardContent>
                        </Card>
                    </Link>)
                }
            </div>
        </div>
    )
}
