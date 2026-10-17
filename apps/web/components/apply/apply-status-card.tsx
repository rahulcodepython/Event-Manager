"use client";

import * as React from "react";
import { AlertCircle, CalendarX2, Hourglass, Users } from "lucide-react";

import { Badge } from "../ui/badge";
import {
    Card,
    CardDescription,
    CardTitle,
} from "../ui/card";
import type { PublicApplyConfig } from "../../schema/publicapply.types";

interface ApplyStatusCardProps {
    config?: PublicApplyConfig | null;
    isError: boolean;
    errorMessage?: string;
    eventFormId: string;
}

export function ApplyStatusCard({
    config,
    isError,
    errorMessage,
    eventFormId,
}: ApplyStatusCardProps) {
    // 1. Not Found / Error
    if (isError || !config) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/20">
                <Card className="max-w-md w-full text-center p-6 space-y-4">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <AlertCircle className="size-6" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold">Form Not Found</CardTitle>
                        <CardDescription className="text-xs">
                            {errorMessage ||
                                "The registration link is invalid, does not exist, or has been taken down."}
                        </CardDescription>
                    </div>
                    <div className="pt-2">
                        <span className="text-[11px] text-muted-foreground font-mono">
                            ID: {eventFormId}
                        </span>
                    </div>
                </Card>
            </div>
        );
    }

    // 2. Waiting / Not Live
    if (config.status === "waiting") {
        return (
            <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/20">
                <Card className="max-w-md w-full text-center p-6 space-y-4">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                        <Hourglass className="size-6" />
                    </div>
                    <div className="space-y-1">
                        <Badge
                            variant="outline"
                            className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-[11px]"
                        >
                            Registration Waiting
                        </Badge>
                        <CardTitle className="text-lg font-bold pt-2">
                            Registration Not Started
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Registration for{" "}
                            <span className="font-semibold text-foreground">
                                &ldquo;{config.event?.name || "this event"}&rdquo;
                            </span>{" "}
                            is currently in waiting mode and has not opened yet. Please check back later.
                        </CardDescription>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3 text-[11px] text-muted-foreground">
                        <span>The event organizers have not made this form live yet.</span>
                    </div>
                </Card>
            </div>
        );
    }

    // 3. Capacity Full
    if (config.is_full) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/20">
                <Card className="max-w-md w-full text-center p-6 space-y-4">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <Users className="size-6" />
                    </div>
                    <div className="space-y-1">
                        <Badge
                            variant="outline"
                            className="border-destructive/30 text-destructive bg-destructive/10 text-[11px]"
                        >
                            Capacity Full
                        </Badge>
                        <CardTitle className="text-lg font-bold pt-2">
                            Registration Closed
                        </CardTitle>
                        <CardDescription className="text-xs">
                            The maximum capacity of {config.max_applicants} participants for{" "}
                            <span className="font-semibold text-foreground">
                                &ldquo;{config.event?.name || "this event"}&rdquo;
                            </span>{" "}
                            has been reached. No further applications are being accepted.
                        </CardDescription>
                    </div>
                </Card>
            </div>
        );
    }

    // 4. Expired Deadline
    if (config.is_expired) {
        const formattedDate = config.expires_at
            ? new Date(config.expires_at).toLocaleString()
            : "the scheduled deadline";

        return (
            <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/20">
                <Card className="max-w-md w-full text-center p-6 space-y-4">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <CalendarX2 className="size-6" />
                    </div>
                    <div className="space-y-1">
                        <Badge
                            variant="outline"
                            className="border-destructive/30 text-destructive bg-destructive/10 text-[11px]"
                        >
                            Deadline Passed
                        </Badge>
                        <CardTitle className="text-lg font-bold pt-2">
                            Registration Expired
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Registration for{" "}
                            <span className="font-semibold text-foreground">
                                &ldquo;{config.event?.name || "this event"}&rdquo;
                            </span>{" "}
                            closed on <span className="font-semibold text-foreground">{formattedDate}</span>.
                        </CardDescription>
                    </div>
                </Card>
            </div>
        );
    }

    return null;
}
