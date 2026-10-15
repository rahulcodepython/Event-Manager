"use client";

import * as React from "react";
import { Calendar, Clock, MapPin, ShieldCheck, UserCheck } from "lucide-react";

import { Badge } from "../ui/badge";
import type { PublicEventInfo, PublicFormInfo } from "../../schema/publicapply.types";

interface ApplyEventHeaderProps {
    event?: PublicEventInfo;
    form?: PublicFormInfo;
    /** The event's credit includes branding: show the event logo. */
    branding?: boolean;
}

export function ApplyEventHeader({ event, form, branding = false }: ApplyEventHeaderProps) {
    return (
        <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
                <Badge
                    variant="outline"
                    className="text-[11px] gap-1 px-2 py-0.5 font-medium border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
                >
                    <ShieldCheck className="size-3 text-emerald-500" />
                    <span>Official Registration</span>
                </Badge>
                <Badge
                    variant="secondary"
                    className="text-[10px] uppercase tracking-wider font-semibold"
                >
                    Open
                </Badge>
            </div>

            {
                // Logos are arbitrary external URLs, so next/image can't be configured for them.
                // eslint-disable-next-line @next/next/no-img-element
                branding && event?.logo && <img
                    src={event.logo}
                    alt={`${event.name} logo`}
                    className="h-12 w-auto max-w-[200px] object-contain"
                />
            }

            <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {event?.name || "Event Registration"}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {form?.name || "Registration Form"}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t text-xs text-muted-foreground">
                {event?.start_date && (
                    <div className="flex items-center gap-2">
                        <Calendar className="size-3.5 text-primary shrink-0" />
                        <span>Starts: {event.start_date}</span>
                    </div>
                )}
                {event?.end_date && (
                    <div className="flex items-center gap-2">
                        <Clock className="size-3.5 text-primary shrink-0" />
                        <span>Ends: {event.end_date}</span>
                    </div>
                )}
                {event?.venue && (
                    <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-primary shrink-0" />
                        <span>Venue: {event.venue}</span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <UserCheck className="size-3.5 text-primary shrink-0" />
                    <span>Identity Card Verified</span>
                </div>
            </div>
        </div>
    );
}
