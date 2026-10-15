"use client";

import * as React from "react";
import { Layers } from "lucide-react";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { useDeviceSubEventsQuery } from "../../query-hooks/attendance.api";

export type ScanTarget = { eventId: string, subEventId: string, name: string } | null;

/**
 * Switches the scanner between the event gate (default) and one sub-event.
 * In sub-event mode only applicants enrolled in it pass.
 */
export function ScannerModePicker({ value, onChange }: { value: ScanTarget, onChange: (target: ScanTarget) => void }) {
    const { data: events = [] } = useDeviceSubEventsQuery(true);
    const withSubEvents = events.filter((e) => e.sub_events.length > 0);

    if (withSubEvents.length === 0) return null;

    const items = [
        { value: "", label: "Event entrance" },
        ...withSubEvents.flatMap((e) => e.sub_events.map((s) => ({ value: `${e.event_id}|${s.id}`, label: s.name }))),
    ];

    return (
        <div className="mb-3 flex w-full max-w-md items-center gap-2 px-1">
            <Layers className="size-4 shrink-0 text-muted-foreground" />
            <Select
                value={value ? `${value.eventId}|${value.subEventId}` : ""}
                items={items}
                onValueChange={(v) => {
                    if (!v) {
                        onChange(null);
                        return;
                    }
                    const [eventId, subEventId] = v.split("|");
                    onChange({ eventId, subEventId, name: items.find((i) => i.value === v)?.label ?? "" });
                }}
            >
                <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="">Event entrance</SelectItem>
                    {
                        withSubEvents.map((e) => <SelectGroup key={e.event_id}>
                            <SelectLabel>{e.event_name}</SelectLabel>
                            {
                                e.sub_events.map((s) => <SelectItem key={s.id} value={`${e.event_id}|${s.id}`}>
                                    {s.name}
                                </SelectItem>)
                            }
                        </SelectGroup>)
                    }
                </SelectContent>
            </Select>
        </div>
    );
}
