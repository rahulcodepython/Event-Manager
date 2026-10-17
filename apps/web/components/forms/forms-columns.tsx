"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "../ui/badge";
import type { Form } from "../../schema/forms.types";

export const formsColumns: ColumnDef<Form>[] = [
    {
        accessorKey: "name",
        header: "Template Name",
        cell: ({ row }) => {
            return (
                <Link
                    className="group/link inline-flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors py-0.5"
                    href={`/dashboard/forms/${row.original.id}/design`}
                    title="Click to visit Form Designer (or right click row for options)"
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
        accessorKey: "fields",
        header: "Fields",
        cell: ({ row }) => {
            const count = row.original.fields?.length ?? 0;
            return (
                <Badge variant="secondary" className="font-normal text-xs">
                    {count} {count === 1 ? "field" : "fields"}
                </Badge>
            );
        },
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
