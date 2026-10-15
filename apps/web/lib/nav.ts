"use client";

import { useMemo } from "react";
import { ArrowLeft, BarChart3, Calendar, CalendarDays, FileText, LayoutDashboard, Settings, Smartphone, TicketIcon, Users } from "lucide-react";

import { useEventQuery } from "../query-hooks/events.api";
import type { NavItem, NavNode } from "../schema/sidebar.types";

// Only need the id/slug segment right after /dashboard/events/
const EVENT_ID_REGEX = /^\/dashboard\/events\/([^/]+)/;
const RESERVED_EVENT_SEGMENTS = new Set(["create", "new"]);

// Static shape — build once at module scope instead of on every call.
const ROOT_NAV_LAYOUT: NavNode[] = [
    {
        title: "Dashboard",
        type: "group",
        items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
    },
    {
        title: "Management",
        type: "group",
        items: [
            { title: "Events", url: "/dashboard/events", icon: Calendar },
            { title: "Credits", url: "/dashboard/credits", icon: TicketIcon },
            { title: "Forms", url: "/dashboard/forms", icon: FileText },
            { title: "Devices", url: "/dashboard/devices", icon: Smartphone },
        ],
    },
];

/** Sub-pages of a single event; shared by the sidebar and the overview page. */
export function getEventSections(eventId: string): NavItem[] {
    const basePath = `/dashboard/events/${eventId}`;

    return [
        { title: "Overview", url: basePath, icon: LayoutDashboard },
        { title: "Dates", url: `${basePath}/dates`, icon: CalendarDays, description: "Active days and session hours" },
        { title: "Registration Form", url: `${basePath}/form`, icon: FileText, description: "Registration form, capacity and sharing" },
        { title: "Applicants", url: `${basePath}/applicants`, icon: Users, description: "Registered attendees and their QR codes" },
        { title: "Devices", url: `${basePath}/devices`, icon: Smartphone, description: "Scanner terminals assigned to this event" },
        { title: "Analysis", url: `${basePath}/analysis`, icon: BarChart3, description: "Turnout, trends and punctuality" },
        { title: "Settings", url: `${basePath}/settings`, icon: Settings, description: "Event name, dates, venue and organizer" },
    ];
}

function createEventSingleNavLayout(eventId: string, eventName: string): NavNode[] {
    return [
        { type: "back", icon: ArrowLeft, title: "Back To Events", url: "/dashboard/events" },
        {
            title: eventName.length > 32 ? `${eventName.slice(0, 32)}...` : eventName,
            type: "group",
            items: getEventSections(eventId),
        },
    ];
}

export function useNavLayout(pathname: string): NavNode[] {
    const rawEventId = EVENT_ID_REGEX.exec(pathname)?.[1] ?? "";
    const eventId = rawEventId && !RESERVED_EVENT_SEGMENTS.has(rawEventId) ? rawEventId : "";

    const { data: event } = useEventQuery(eventId);

    return useMemo(() => {
        if (eventId) {
            return createEventSingleNavLayout(eventId, event?.name || "Event");
        }
        return ROOT_NAV_LAYOUT;
    }, [eventId, event?.name]);
}