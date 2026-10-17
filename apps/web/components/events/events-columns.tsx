"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { Event } from "../../schema/events.types";

export const eventsColumns: ColumnDef<Event>[] = [
    {
        accessorKey: "name",
        header: "Event Name",
        cell: ({ row }) => {
            return (
                <Link
                    className="group/link inline-flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors py-0.5"
                    href={`/dashboard/events/${row.original.id}`}
                    title="Click to visit Event page (or right click row for options)"
                >
                    <span className="group-hover/link:underline underline-offset-4 decoration-primary/50">
                        {row.original.name}
                    </span>
                    <ArrowUpRight className="size-3.5 text-primary opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all shrink-0" />
                </Link>
            );
        },
    },
    {
        accessorKey: "start_date",
        header: "Start Date",
        cell: ({ row }) => <span>{row.original.start_date}</span>,
    },
    {
        accessorKey: "end_date",
        header: "End Date",
        cell: ({ row }) => <span>{row.original.end_date}</span>,
    },
    {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => {
            const date = new Date(row.original.created_at);
            return (
                <span className="text-xs text-muted-foreground">
                    {isNaN(date.getTime()) ? "-" : date.toLocaleDateString()}
                </span>
            );
        },
    },
];
