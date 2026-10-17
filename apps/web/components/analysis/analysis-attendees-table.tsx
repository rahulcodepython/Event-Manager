"use client";

import * as React from "react";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Copy,
    Mail,
    Search,
    User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "../ui/card";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "../ui/context-menu";
import { Input } from "../ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";
import type { AttendeeAnalysisItem } from "../../schema/attendance.types";

export interface AvailableDateOption {
    date: string;
    start_time?: string | null;
    end_time?: string | null;
}

interface AnalysisAttendeesTableProps {
    data: AttendeeAnalysisItem[];
    total: number;
    page: number;
    limit: number;
    search: string;
    status: string;
    hasDateRange: boolean;
    selectedDate: string;
    availableDates: AvailableDateOption[];
    onSearchChange: (val: string) => void;
    onStatusChange: (val: string) => void;
    onSelectedDateChange: (val: string) => void;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
}

export function AnalysisAttendeesTable({
    data,
    total,
    page,
    limit,
    search,
    status,
    hasDateRange,
    selectedDate,
    availableDates,
    onSearchChange,
    onStatusChange,
    onSelectedDateChange,
    onPageChange,
    isLoading = false,
}: AnalysisAttendeesTableProps) {
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return "--";
        const d = new Date(timeStr);
        return isNaN(d.getTime()) ? timeStr : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <Card className="shadow-xs border-border/80">
            <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">Attendee Roster</CardTitle>
                        <CardDescription className="text-sm">
                            Select a session date to audit entries, departures, and timings
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Session Date Selector */}
                        <div className="flex items-center gap-2">
                            <Select
                                value={selectedDate}
                                disabled={!hasDateRange || availableDates.length === 0}
                                onValueChange={(val) => {
                                    if (val !== null) onSelectedDateChange(val);
                                }}
                            >
                                <SelectTrigger className="h-10 text-sm min-w-48">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="size-4 text-muted-foreground" />
                                        <SelectValue
                                            placeholder={
                                                !hasDateRange
                                                    ? "Select date range first..."
                                                    : availableDates.length === 0
                                                    ? "No dates in range"
                                                    : "Select session date..."
                                            }
                                        />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {availableDates.map((opt) => (
                                        <SelectItem key={opt.date} value={opt.date}>
                                            {opt.date}{" "}
                                            {opt.start_time && opt.end_time
                                                ? `(${opt.start_time} - ${opt.end_time})`
                                                : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search attendees..."
                                value={search}
                                disabled={!selectedDate}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="h-10 w-48 pl-9 text-sm disabled:opacity-50"
                            />
                        </div>

                        {/* Status Filter */}
                        <Select
                            value={status}
                            disabled={!selectedDate}
                            onValueChange={(val) => {
                                if (val !== null) onStatusChange(val);
                            }}
                        >
                            <SelectTrigger className="h-10 text-sm min-w-40">
                                <SelectValue placeholder="All Attendees" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Attendees</SelectItem>
                                <SelectItem value="attended">Attended</SelectItem>
                                <SelectItem value="inside">Currently Inside</SelectItem>
                                <SelectItem value="not_attended">Not Appeared</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <TooltipProvider delay={100}>
                    <div className="rounded-xl border bg-card shadow-xs overflow-x-auto">
                        <Table className="min-w-[920px]">
                            <TableHeader>
                                <TableRow className="text-xs bg-muted/40">
                                    <TableHead className="font-semibold sticky left-0 z-30 bg-card w-[280px] min-w-[280px] max-w-[280px] border-r border-border shadow-[1px_0_0_0_hsl(var(--border))]">
                                        Attendee Details
                                    </TableHead>
                                    <TableHead className="font-semibold min-w-[120px]">Session Date</TableHead>
                                    <TableHead className="font-semibold min-w-[130px]">Time Range</TableHead>
                                    <TableHead className="font-semibold min-w-[100px]">Check-In</TableHead>
                                    <TableHead className="font-semibold min-w-[100px]">Check-Out</TableHead>
                                    <TableHead className="font-semibold min-w-[110px]">Punctuality</TableHead>
                                    <TableHead className="font-semibold min-w-[130px]">Terminal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="text-xs">
                                {!hasDateRange ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            Please select a date range above to view attendance records.
                                        </TableCell>
                                    </TableRow>
                                ) : !selectedDate ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            Please select a session date from the dropdown above to load attendees.
                                        </TableCell>
                                    </TableRow>
                                ) : isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            Loading attendees...
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            No attendees found for this session date.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item) => (
                                        <ContextMenu key={`${item.applicant_id}-${item.date || "none"}`}>
                                            <ContextMenuTrigger
                                                render={
                                                    <TableRow className="group/row hover:bg-muted/25 transition-colors cursor-context-menu select-none">
                                                        <TableCell className="sticky left-0 z-20 bg-card group-hover/row:bg-muted/50 w-[280px] min-w-[280px] max-w-[280px] border-r border-border shadow-[1px_0_0_0_hsl(var(--border))]">
                                                            <div className="flex flex-col gap-1 py-1 text-left">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        {/* Indicator Dot with Tooltip */}
                                                                        <Tooltip>
                                                                            <TooltipTrigger
                                                                                type="button"
                                                                                className="inline-flex size-4 items-center justify-center rounded-full hover:opacity-80 focus-visible:outline-hidden cursor-help shrink-0"
                                                                                aria-label={
                                                                                    item.status === "inside"
                                                                                        ? "Currently Inside"
                                                                                        : item.status === "attended"
                                                                                        ? "Attended"
                                                                                        : "Not Appeared"
                                                                                }
                                                                            >
                                                                                <span
                                                                                    className={cn(
                                                                                        "size-2.5 rounded-full",
                                                                                        item.status === "inside" && "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]",
                                                                                        item.status === "attended" && "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]",
                                                                                        item.status === "not_attended" && "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]",
                                                                                    )}
                                                                                />
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="top">
                                                                                {item.status === "inside"
                                                                                    ? "Currently Inside"
                                                                                    : item.status === "attended"
                                                                                    ? "Attended"
                                                                                    : "Not Appeared"}
                                                                            </TooltipContent>
                                                                        </Tooltip>

                                                                        <span className="font-semibold text-foreground text-xs truncate hover:text-primary transition-colors cursor-pointer">
                                                                            {item.name}
                                                                        </span>
                                                                    </div>

                                                                    {/* Applicant ID pill with Copy */}
                                                                    <span
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigator.clipboard.writeText(item.applicant_id);
                                                                            toast.success("Applicant ID copied");
                                                                        }}
                                                                        className="font-mono text-[10px] text-muted-foreground bg-muted/60 hover:bg-muted px-1.5 py-0.5 rounded border shrink-0 cursor-pointer transition-colors"
                                                                        title="Click to copy ID"
                                                                    >
                                                                        {item.applicant_id.length > 8 ? `${item.applicant_id.slice(0, 8)}…` : item.applicant_id}
                                                                    </span>
                                                                </div>

                                                                <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground pl-6">
                                                                    <span className="font-mono truncate" title={item.email}>
                                                                        {item.email}
                                                                    </span>
                                                                    {item.phone ? (
                                                                        <span className="font-mono text-muted-foreground/80 truncate">
                                                                            {item.phone}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        <TableCell className="text-muted-foreground whitespace-nowrap">
                                                            {item.date || selectedDate || "-"}
                                                        </TableCell>

                                                        <TableCell className="text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                                                            {item.start_time && item.end_time
                                                                ? `${item.start_time} - ${item.end_time}`
                                                                : item.start_time || "-"}
                                                        </TableCell>

                                                        <TableCell className="font-medium text-foreground whitespace-nowrap">
                                                            {formatTime(item.entered_at)}
                                                        </TableCell>

                                                        <TableCell className="text-muted-foreground whitespace-nowrap">
                                                            {formatTime(item.exited_at)}
                                                        </TableCell>

                                                        <TableCell className="whitespace-nowrap">
                                                            {item.is_early === null || item.is_early === undefined ? (
                                                                <span className="text-muted-foreground/50">-</span>
                                                            ) : item.is_early ? (
                                                                <span className="text-emerald-600 font-medium">On-Time</span>
                                                            ) : (
                                                                <span className="text-amber-600 font-medium">Late</span>
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="text-muted-foreground truncate max-w-[140px]">
                                                            {item.device_name || "-"}
                                                        </TableCell>
                                                    </TableRow>
                                                }
                                            />
                                            <ContextMenuContent className="w-52">
                                                <ContextMenuItem
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(item.name);
                                                        toast.success("Attendee name copied");
                                                    }}
                                                    className="gap-2.5"
                                                >
                                                    <User className="size-3.5" />
                                                    <span>Copy Name</span>
                                                </ContextMenuItem>

                                                <ContextMenuItem
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(item.email);
                                                        toast.success("Email copied");
                                                    }}
                                                    className="gap-2.5"
                                                >
                                                    <Mail className="size-3.5" />
                                                    <span>Copy Email</span>
                                                </ContextMenuItem>

                                                <ContextMenuItem
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(item.applicant_id);
                                                        toast.success("Applicant ID copied");
                                                    }}
                                                    className="gap-2.5"
                                                >
                                                    <Copy className="size-3.5" />
                                                    <span>Copy Applicant ID</span>
                                                </ContextMenuItem>

                                                {item.phone && (
                                                    <ContextMenuItem
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(item.phone!);
                                                            toast.success("Mobile number copied");
                                                        }}
                                                        className="gap-2.5"
                                                    >
                                                        <Copy className="size-3.5" />
                                                        <span>Copy Mobile</span>
                                                    </ContextMenuItem>
                                                )}

                                                {item.entered_at && (
                                                    <ContextMenuItem
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(formatTime(item.entered_at));
                                                            toast.success("Check-in time copied");
                                                        }}
                                                        className="gap-2.5"
                                                    >
                                                        <Clock className="size-3.5" />
                                                        <span>Copy Check-In Time</span>
                                                    </ContextMenuItem>
                                                )}

                                                {item.device_name && (
                                                    <ContextMenuItem
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(item.device_name!);
                                                            toast.success("Terminal name copied");
                                                        }}
                                                        className="gap-2.5"
                                                    >
                                                        <Copy className="size-3.5" />
                                                        <span>Copy Terminal Name</span>
                                                    </ContextMenuItem>
                                                )}
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TooltipProvider>

            </CardContent>

            {/* Pagination Controls */}
            {selectedDate && total > 0 && (
                <CardFooter>
                    <div className="text-sm text-muted-foreground">
                        Showing <span className="font-medium text-foreground">{data.length}</span> of{" "}
                        <span className="font-medium text-foreground">{total}</span> records
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-9"
                                disabled={page <= 1 || isLoading}
                                onClick={() => onPageChange(page - 1)}
                            >
                                <ChevronLeft className="size-4" />
                                <span className="sr-only">Previous Page</span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-9"
                                disabled={page >= totalPages || isLoading}
                                onClick={() => onPageChange(page + 1)}
                            >
                                <ChevronRight className="size-4" />
                                <span className="sr-only">Next Page</span>
                            </Button>
                        </div>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
