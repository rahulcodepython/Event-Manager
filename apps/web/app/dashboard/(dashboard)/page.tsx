"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, FileText, Loader2, Plus, Smartphone, TicketIcon } from "lucide-react";

import { PageHeader } from "../../../components/generic";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { useBreadcrumbs } from "../../../hooks/use-breadcrumbs";
import { APP_ROUTES } from "../../../lib/constants";
import { useCreditsQuery } from "../../../query-hooks/credits.api";
import { useEventsInfiniteQuery } from "../../../query-hooks/events.api";
import type { Event } from "../../../schema/events.types";

/** Today in the event's own timezone, as YYYY-MM-DD. */
function today(timezone: string) {
    return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}

function eventStatus(event: Event) {
    if (event.credit?.is_expired) return "Read-only";
    const now = today(event.timezone);
    if (event.end_date < now) return "Ended";
    if (event.start_date > now) return "Upcoming";
    return "Live";
}

function formatRange(start: string, end: string) {
    const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

export default function DashboardPage() {
    useBreadcrumbs([
        {
            title: "Dashboard",
        },
    ]);

    const { data: credits = [], isLoading: creditsLoading } = useCreditsQuery();
    const { data: eventsData, isLoading: eventsLoading } = useEventsInfiniteQuery();

    const events = eventsData?.pages.flatMap((p) => p.data) ?? [];
    const totalEvents = eventsData?.pages[0]?.total ?? 0;
    const activeCredits = credits.filter((c) => c.status === "active");
    const unusedCredits = activeCredits.filter((c) => !c.event);
    const current = events
        .filter((e) => {
            const status = eventStatus(e);
            return status === "Live" || status === "Upcoming";
        })
        .sort((a, b) => a.start_date.localeCompare(b.start_date));
    const loading = creditsLoading || eventsLoading;

    const stats = [
        { label: "Events", value: totalEvents, hint: `${current.length} live or upcoming`, icon: CalendarDays },
        { label: "Active credits", value: activeCredits.length, hint: `${unusedCredits.length} ready for a new event`, icon: TicketIcon },
    ];

    return (
        <>
            <PageHeader
                title="Dashboard"
                description="Your events and credits at a glance."
                actions={
                    <>
                        <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/credits/new" />} className="gap-2">
                            <TicketIcon className="size-4" />
                            Buy credit
                        </Button>
                        <Button nativeButton={false} render={<Link href={APP_ROUTES.EVENTS} />} className="gap-2">
                            <Plus className="size-4" />
                            New event
                        </Button>
                    </>
                }
            />

            {
                loading ? <div className="flex justify-center py-16">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div> : <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {
                            stats.map((s) => <Card key={s.label}>
                                <CardContent className="flex items-center gap-4">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <s.icon className="size-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">{s.label}</span>
                                        <span className="text-2xl font-semibold">{s.value}</span>
                                        <span className="text-xs text-muted-foreground">{s.hint}</span>
                                    </div>
                                </CardContent>
                            </Card>)
                        }
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Live and upcoming events</CardTitle>
                            <CardDescription className="text-xs">Open an event to manage its form, applicants and scanners.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {
                                current.length === 0 ? <div className="flex flex-col items-center gap-3 py-8 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        {unusedCredits.length > 0 ? "You have a credit ready. Create an event to start taking registrations." : "No live or upcoming events. Buy a credit to run your next event."}
                                    </p>
                                    <Button
                                        size="sm"
                                        nativeButton={false}
                                        render={<Link href={unusedCredits.length > 0 ? APP_ROUTES.EVENTS : "/dashboard/credits/new"} />}
                                    >
                                        {unusedCredits.length > 0 ? "Create event" : "Buy credit"}
                                    </Button>
                                </div> : <ul className="divide-y">
                                    {
                                        current.map((e) => <li key={e.id}>
                                            <Link href={APP_ROUTES.EVENT_OVERVIEW(e.id)} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                                                <div className="flex min-w-0 flex-col">
                                                    <span className="truncate text-sm font-medium">{e.name}</span>
                                                    <span className="text-xs text-muted-foreground">{formatRange(e.start_date, e.end_date)}{e.venue ? ` · ${e.venue}` : ""}</span>
                                                </div>
                                                <Badge variant={eventStatus(e) === "Live" ? "default" : "secondary"} className="text-xs">{eventStatus(e)}</Badge>
                                            </Link>
                                        </li>)
                                    }
                                </ul>
                            }
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Link href={APP_ROUTES.FORMS} className="rounded-xl border p-4 transition-colors hover:bg-muted/40">
                            <FileText className="mb-2 size-5 text-primary" />
                            <p className="text-sm font-medium">Form templates</p>
                            <p className="text-xs text-muted-foreground">Reusable registration forms for your events.</p>
                        </Link>
                        <Link href={APP_ROUTES.DEVICES} className="rounded-xl border p-4 transition-colors hover:bg-muted/40">
                            <Smartphone className="mb-2 size-5 text-primary" />
                            <p className="text-sm font-medium">Scanner devices</p>
                            <p className="text-xs text-muted-foreground">Pair phones to check people in at the gate.</p>
                        </Link>
                    </div>
                </div>
            }
        </>
    );
}
