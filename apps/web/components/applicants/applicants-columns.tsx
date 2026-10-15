import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";

import { Badge } from "../ui/badge";
import type { ApplicantItem, FormFieldSummary } from "../../schema/applicants.types";
import { ApplicantImage } from "./applicant-image";
import { ApplicantUserIdCell } from "./applicant-user-id-cell";
import { formatFieldValue } from "./applicants-utils";

const CARD_STATUS: Record<ApplicantItem["card_status"], { label: string, variant: "outline" | "secondary" | "default" | "destructive" }> = {
    pending: { label: "Not sent", variant: "outline" },
    queued: { label: "Sending", variant: "secondary" },
    sent: { label: "Sent", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
};

export function getApplicantsColumns(
    formFields?: FormFieldSummary[],
    eventId?: string
): ColumnDef<ApplicantItem>[] {
    const baseColumns: ColumnDef<ApplicantItem>[] = [
        {
            id: "applicant_details",
            header: "Applicant Details",
            meta: {
                headerClassName:
                    "sticky left-0 z-30 bg-card w-[280px] min-w-[280px] max-w-[280px] border-r border-border shadow-[1px_0_0_0_hsl(var(--border))]",
                cellClassName:
                    "sticky left-0 z-20 bg-card group-hover/row:bg-muted/50 group-data-[state=selected]/row:bg-muted w-[280px] min-w-[280px] max-w-[280px] border-r border-border shadow-[1px_0_0_0_hsl(var(--border))]",
            },
            cell: ({ row }) => {
                const item = row.original;
                const date = new Date(row.original.created_at);

                return (
                    <div className="flex flex-col gap-1 py-1 text-left">
                        <div className="flex items-center justify-between gap-2">
                            <span
                                className="font-semibold text-foreground text-xs truncate max-w-40 hover:text-primary hover:underline underline-offset-4 cursor-pointer transition-colors"
                                title={`${item.name} (Right-click row for actions)`}
                            >
                                {item.name}
                            </span>
                            <ApplicantUserIdCell userId={item.user_id} />
                        </div>
                        <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                            <span className="font-mono truncate" title={item.email}>
                                {item.email}
                            </span>
                            <div className="flex justify-between items-center">
                                <span className="font-mono text-muted-foreground/80 truncate">
                                    {String(item.phone)}
                                </span>
                                <span className="font-mono text-muted-foreground/80 truncate">
                                    {isNaN(date.getTime()) ? "-" : date.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            id: "sub_events",
            header: "Sub-events",
            meta: {
                headerClassName: "min-w-[140px] max-w-[240px]",
                cellClassName: "min-w-[140px] max-w-[240px]",
            },
            cell: ({ row }) => {
                const subEvents = row.original.sub_events;
                if (subEvents.length === 0) return <span className="text-muted-foreground">-</span>;
                return <div className="flex flex-wrap gap-1">
                    {
                        subEvents.map((s) => <Badge key={s.id} variant="secondary" className="text-[10px]">
                            {s.name}
                        </Badge>)
                    }
                </div>;
            },
        },
        {
            id: "card_status",
            header: "ID Card",
            meta: {
                headerClassName: "min-w-[110px]",
                cellClassName: "min-w-[110px]",
            },
            cell: ({ row }) => {
                const card = CARD_STATUS[row.original.card_status];
                return <Badge variant={card.variant} title={row.original.card_error || undefined}>
                    {card.label}
                </Badge>;
            },
        },
    ];

    // Filter out standard fields already displayed in the static applicant column
    const dynamicFields = (formFields || []).filter(
        (f) =>
            f.key !== "name" &&
            f.key !== "email" &&
            f.key !== "user_id" &&
            f.key !== "phone" &&
            f.key !== "mobile"
    );

    const dynamicColumns: ColumnDef<ApplicantItem>[] = dynamicFields.map((field) => ({
        id: `field_${field.key}`,
        header: field.label || field.key,
        meta: {
            headerClassName: "min-w-[160px] max-w-[240px]",
            cellClassName: "min-w-[160px] max-w-[240px]",
        },
        cell: ({ row }) => {
            const val = row.original.data?.[field.key];
            if (val === undefined || val === null || val === "") {
                return <span className="text-xs text-muted-foreground/50">-</span>;
            }
            if ((field.type === "photo" || field.type === "signature") && eventId) {
                return <ApplicantImage eventId={eventId} applicantId={row.original.user_id} fieldKey={field.key} type={field.type} />;
            }

            if (typeof val === "boolean") {
                return (
                    <Badge
                        variant={val ? "default" : "secondary"}
                        className="text-[10px] font-normal"
                    >
                        {val ? "Yes" : "No"}
                    </Badge>
                );
            }

            const display = formatFieldValue(field, val);

            return (
                <span
                    className="text-xs text-foreground truncate max-w-55 block"
                    title={display}
                >
                    {display}
                </span>
            );
        },
    }));

    const trailingColumns: ColumnDef<ApplicantItem>[] = [
        {
            accessorKey: "created_at",
            header: "Registered At",
            meta: {
                headerClassName: "min-w-[140px] max-w-[160px]",
                cellClassName: "min-w-[140px] max-w-[160px]",
            },
            cell: ({ row }) => {
                const date = new Date(row.original.created_at);
                return (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {isNaN(date.getTime()) ? "-" : date.toLocaleString()}
                    </span>
                );
            },
        },
    ];

    return [...baseColumns, ...dynamicColumns, ...trailingColumns];
}

export const applicantsColumns: ColumnDef<ApplicantItem>[] = getApplicantsColumns();
