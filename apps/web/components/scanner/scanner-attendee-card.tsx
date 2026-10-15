"use client";

import * as React from "react";
import {
    CalendarDays,
    CheckCircle2,
    Clock,
    Loader2,
    LogIn,
    LogOut,
    RefreshCw,
    Smartphone,
    UserCheck,
} from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import type { ScanApplicantResponse } from "../../schema/attendance.types";

interface ScannerAttendeeCardProps {
    data: ScanApplicantResponse;
    onMarkEntry: () => void;
    onMarkExit: () => void;
    onScanAgain: () => void;
    isEntryPending: boolean;
    isExitPending: boolean;
}

export function ScannerAttendeeCard({
    data,
    onMarkEntry,
    onMarkExit,
    onScanAgain,
    isEntryPending,
    isExitPending,
}: ScannerAttendeeCardProps) {
    const { applicant, event, sub_event, event_date, device, attendance } = data;

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return "-";
        const d = new Date(timeStr);
        return isNaN(d.getTime()) ? timeStr : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    return (
        <Card className="w-full max-w-md shadow-md border-border/80 bg-card">
            <CardHeader className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                    <UserCheck className="size-6" />
                </div>
                <CardTitle className="text-lg font-bold text-foreground">
                    {applicant.name}
                </CardTitle>
                <CardDescription className="text-sm font-mono">
                    {applicant.email} • {applicant.user_id}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
                {/* Status Indicator Banner */}
                <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Clock className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground font-medium">Admission Status</span>
                    </div>

                    {
                        attendance.status === "ready_for_entry" ? <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs gap-1">
                            <span>Ready For Entry</span>
                        </Badge> : attendance.status === "ready_for_exit" ? <Badge variant="default" className="bg-emerald-600 text-xs gap-1">
                            <CheckCircle2 className="size-3" />
                            <span>Currently Inside</span>
                        </Badge> : attendance.status === "session_ended" ? <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 text-xs gap-1">
                            <span>Session Ended</span>
                        </Badge> : <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                            <span>Completed / Exited</span>
                        </Badge>
                    }
                </div>

                {/* Event & Date Details */}
                <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <CalendarDays className="size-3.5" />
                            <span>Event</span>
                        </span>
                        <span className="font-semibold text-foreground text-right truncate max-w-[200px]">
                            {event.name}
                        </span>
                    </div>

                    {
                        sub_event && <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Sub-event</span>
                            <span className="font-semibold text-primary text-right truncate max-w-[200px]">
                                {sub_event.name}{sub_event.venue ? ` · ${sub_event.venue}` : ""}
                            </span>
                        </div>
                    }

                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Session Date</span>
                        <span className="font-medium text-foreground">
                            {event_date.date} ({event_date.start_time} - {event_date.end_time})
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <Smartphone className="size-3.5" />
                            <span>Scanner Terminal</span>
                        </span>
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                            {device.name}
                        </span>
                    </div>
                </div>

                {/* Timestamps if recorded */}
                {
                    attendance.entered_at && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Entry Time</span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                {formatTime(attendance.entered_at)}
                            </span>
                        </div>
                        {
                            attendance.is_early !== null && <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">Punctuality</span>
                                <span className={attendance.is_early ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                                    {attendance.is_early ? "Checked in Early / On Time" : "Checked in Late"}
                                </span>
                            </div>
                        }
                        {
                            attendance.exited_at && <div className="flex items-center justify-between pt-1 border-t border-border/50">
                                <span className="text-muted-foreground">Exit Time</span>
                                <span className="font-semibold text-foreground">
                                    {formatTime(attendance.exited_at)}
                                </span>
                            </div>
                        }
                    </div>
                }
            </CardContent>

            <CardFooter className="flex flex-col gap-2.5 border-t border-border px-6 py-4 bg-muted/20">
                {
                    attendance.status === "ready_for_entry" ? (
                        <Button
                            type="button"
                            variant="default"
                            onClick={onMarkEntry}
                            disabled={isEntryPending}
                            className="w-full gap-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isEntryPending ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <LogIn className="size-4" />
                            )}
                            <span>
                                {isEntryPending
                                    ? "Recording Entry..."
                                    : "Mark Entry / Check-In"}
                            </span>
                        </Button>
                    ) : attendance.status === "ready_for_exit" ? (
                        <Button
                            type="button"
                            variant="default"
                            onClick={onMarkExit}
                            disabled={isExitPending}
                            className="w-full gap-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {isExitPending ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <LogOut className="size-4" />
                            )}
                            <span>
                                {isExitPending
                                    ? "Recording Exit..."
                                    : "Mark Exit / Check-Out"}
                            </span>
                        </Button>
                    ) : attendance.status === "session_ended" ? (
                        <div className="w-full rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center text-sm text-destructive space-y-1">
                            <p className="font-semibold">Event Session Ended</p>
                            <p className="text-xs text-muted-foreground">
                                Check-in is closed because the scheduled session end time ({event_date.end_time}) has passed.
                            </p>
                        </div>
                    ) : (
                        <div className="w-full rounded-lg bg-muted/40 p-2.5 text-center text-muted-foreground text-xs">
                            Attendance already completed for this date.
                        </div>
                    )
                }

                <Button
                    type="button"
                    variant="outline"
                    onClick={onScanAgain}
                    className="w-full gap-2 text-sm font-medium h-10"
                >
                    <RefreshCw className="size-4" />
                    <span>Scan Next Badge</span>
                </Button>
            </CardFooter>
        </Card>
    );
}
