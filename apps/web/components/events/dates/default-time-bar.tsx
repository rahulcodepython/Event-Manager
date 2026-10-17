"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

export interface DefaultTimeBarProps {
    startTime: string;
    endTime: string;
    onStartTimeChange: (val: string) => void;
    onEndTimeChange: (val: string) => void;
}

export function DefaultTimeBar({
    startTime,
    endTime,
    onStartTimeChange,
    onEndTimeChange,
}: DefaultTimeBarProps) {
    return (
        <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3">
            <div className="flex flex-col gap-1">
                <Label htmlFor="default-start" className="text-[11px] text-muted-foreground">
                    Default Start Time
                </Label>
                <Input
                    id="default-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => onStartTimeChange(e.target.value)}
                    className="h-8 w-32 text-xs"
                />
            </div>
            <div className="flex flex-col gap-1">
                <Label htmlFor="default-end" className="text-[11px] text-muted-foreground">
                    Default End Time
                </Label>
                <Input
                    id="default-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => onEndTimeChange(e.target.value)}
                    className="h-8 w-32 text-xs"
                />
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Info className="size-3.5 shrink-0" />
                <span>Applied to newly clicked dates</span>
            </div>
        </div>
    );
}