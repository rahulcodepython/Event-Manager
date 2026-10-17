"use client"

import * as React from "react"

import { useBreadcrumbs } from "../../hooks/use-breadcrumbs"
import type { Event } from "../../schema/events.types"

interface EventContextValue {
    event: Event
    eventId: string
}

const EventContext = React.createContext<EventContextValue | null>(null)

export function EventProvider({
    event,
    eventId,
    children,
}: EventContextValue & { children: React.ReactNode }) {
    return (
        <EventContext.Provider value={{ event, eventId }}>
            {children}
        </EventContext.Provider>
    )
}

/**
 * Current event for any page under dashboard/events/[eventId]. The layout
 * handles loading and 404, so the event is always present here.
 */
export function useCurrentEvent(): EventContextValue {
    const context = React.useContext(EventContext)
    if (!context) {
        throw new Error("useCurrentEvent must be used within an EventProvider")
    }
    return context
}

/**
 * Standard setup for an event sub-page: returns the current event and sets
 * the "Dashboard / Events / <event> / <pageTitle>" breadcrumbs.
 */
export function useEventPage(pageTitle?: string): EventContextValue {
    const ctx = useCurrentEvent()

    useBreadcrumbs([
        { title: "Dashboard", url: "/dashboard" },
        { title: "Events", url: "/dashboard/events" },
        pageTitle
            ? { title: ctx.event.name, url: `/dashboard/events/${ctx.eventId}` }
            : { title: ctx.event.name },
        ...(pageTitle ? [{ title: pageTitle }] : []),
    ])

    return ctx
}
