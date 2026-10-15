"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

import { EventNotFound } from "../../../../components/events/event-not-found";
import { EventProvider } from "../../../../components/events/event-context";
import { useEventQuery } from "../../../../query-hooks/events.api";

export default function EventSingleLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams<{ eventId: string }>();
    const eventId = params?.eventId ?? "";

    const { data: event, isLoading } = useEventQuery(eventId);

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span className="text-xs">Loading event details...</span>
                </div>
            </div>
        );
    }

    if (!event) {
        return <EventNotFound />;
    }

    return (
        <EventProvider event={event} eventId={eventId}>
            <div className="container flex min-w-0 flex-1 flex-col gap-6 pb-8">
                {
                    event.credit?.kind === "trial" && <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                        Trial event: for testing only, not for real use. It will be deleted when the trial ends on{" "}
                        {new Date(event.credit.ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.
                    </div>
                }
                {children}
            </div>
        </EventProvider>
    );
}
