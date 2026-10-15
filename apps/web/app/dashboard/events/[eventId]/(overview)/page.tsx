"use client"

import * as React from "react"
import Link from "next/link"
import { Calendar, MapPin, Users } from "lucide-react"

import { useEventPage } from "../../../../../components/events/event-context"
import { PageHeader } from "../../../../../components/generic"
import { Badge } from "../../../../../components/ui/badge"
import { Card } from "../../../../../components/ui/card"
import { getEventSections } from "../../../../../lib/nav"

function formatDate(value: string): string {
    const d = new Date(value)
    return isNaN(d.getTime())
        ? value
        : d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
          })
}

export default function EventOverviewPage() {
    const { event, eventId } = useEventPage()

    const isEnded = event.end_date < new Date().toISOString().split("T")[0]
    const sections = getEventSections(eventId).filter((s) => s.description)

    return (
        <>
            <PageHeader
                title={event.name}
                badge={
                    <Badge
                        variant={isEnded ? "secondary" : "default"}
                        className="text-xs"
                    >
                        {isEnded ? "Ended" : "Active"}
                    </Badge>
                }
                description={
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1">
                            <Calendar className="size-3.5" />
                            {formatDate(event.start_date)} -{" "}
                            {formatDate(event.end_date)}
                        </span>
                        {event.venue && (
                            <span className="flex items-center gap-1">
                                <MapPin className="size-3.5" />
                                {event.venue}
                            </span>
                        )}
                        {event.organizer && (
                            <span className="flex items-center gap-1">
                                <Users className="size-3.5" />
                                {event.organizer}
                            </span>
                        )}
                    </div>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sections.map((section) => (
                    <Card
                        key={section.url}
                        className="transition-colors hover:bg-muted/40"
                    >
                        <Link href={section.url} className="block p-5">
                            <div className="flex items-center gap-3">
                                <div className="rounded-md bg-primary/10 p-2 text-primary">
                                    <section.icon className="size-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-foreground">
                                        {section.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {section.description}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </Card>
                ))}
            </div>
        </>
    )
}
