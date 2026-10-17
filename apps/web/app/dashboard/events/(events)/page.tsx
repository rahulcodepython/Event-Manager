"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Calendar,
    Copy,
    ExternalLink,
    Settings,
    Smartphone,
    Users,
} from "lucide-react";
import { toast } from "sonner";

import { CreateEventDialog } from "../../../../components/events/create-event-dialog";
import { eventsColumns } from "../../../../components/events/events-columns";
import { InfiniteDataTable } from "../../../../components/generic";
import {
    ContextMenuItem,
    ContextMenuSeparator,
} from "../../../../components/ui/context-menu";
import { useBreadcrumbs } from "../../../../hooks/use-breadcrumbs";
import { useEventsInfiniteQuery } from "../../../../query-hooks/events.api";
import type { Event } from "../../../../schema/events.types";

export default function EventsPage() {
    const router = useRouter();
    const [search, setSearch] = React.useState("");

    useBreadcrumbs([
        {
            title: "Dashboard",
            url: "/dashboard",
        },
        {
            title: "Events",
        },
    ]);

    const {
        data,
        isLoading,
        isError,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useEventsInfiniteQuery({ search });

    const flatEvents = React.useMemo(() => {
        return data?.pages.flatMap((page) => page.data) ?? [];
    }, [data]);

    const totalCount = data?.pages[0]?.total ?? flatEvents.length;

    const renderRowContextMenu = (row: { original: Event }) => {
        const event = row.original;
        return (
            <>
                <ContextMenuItem
                    onClick={() => router.push(`/dashboard/events/${event.id}`)}
                    className="gap-2.5 font-medium"
                >
                    <ExternalLink className="size-3.5 text-primary" />
                    <span>Visit Event Page</span>
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem
                    onClick={() => router.push(`/dashboard/events/${event.id}/applicants`)}
                    className="gap-2.5"
                >
                    <Users className="size-3.5" />
                    <span>View Applicants</span>
                </ContextMenuItem>

                <ContextMenuItem
                    onClick={() => router.push(`/dashboard/events/${event.id}/dates`)}
                    className="gap-2.5"
                >
                    <Calendar className="size-3.5" />
                    <span>Manage Dates & Schedule</span>
                </ContextMenuItem>

                <ContextMenuItem
                    onClick={() => router.push(`/dashboard/events/${event.id}/devices`)}
                    className="gap-2.5"
                >
                    <Smartphone className="size-3.5" />
                    <span>Manage Scanner Devices</span>
                </ContextMenuItem>

                <ContextMenuItem
                    onClick={() => router.push(`/dashboard/events/${event.id}/settings`)}
                    className="gap-2.5"
                >
                    <Settings className="size-3.5" />
                    <span>Event Settings</span>
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem
                    onClick={() => {
                        navigator.clipboard.writeText(event.id);
                        toast.success("Event ID copied to clipboard");
                    }}
                    className="gap-2.5"
                >
                    <Copy className="size-3.5" />
                    <span>Copy Event ID</span>
                </ContextMenuItem>
            </>
        );
    };

    return (
        <InfiniteDataTable
            columns={eventsColumns}
            data={flatEvents}
            totalCount={totalCount}
            isLoading={isLoading}
            isError={isError}
            error={error}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            searchPlaceholder="Search events..."
            onSearchChange={setSearch}
            toolbarActions={<CreateEventDialog />}
            itemLabel="events"
            renderRowContextMenu={renderRowContextMenu}
        />
    );
}
