"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../../lib/utils";

export interface DatePickerProps {
    value?: string;
    onChange?: (dateString: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Select date",
    disabled = false,
    className,
    id,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const selectedDate = React.useMemo(() => {
        if (!value) return undefined;
        // Parse YYYY-MM-DD or ISO string without timezone shift
        const parts = value.split("T")[0].split("-");
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) return d;
        }
        const d = new Date(value);
        return !isNaN(d.getTime()) ? d : undefined;
    }, [value]);

    const formattedDisplay = React.useMemo(() => {
        if (!selectedDate) return null;
        return selectedDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }, [selectedDate]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                id={id}
                disabled={disabled}
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-xs transition-colors outline-none hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 text-left font-normal",
                    !selectedDate && "text-muted-foreground",
                    className
                )}
            >
                <span className="flex items-center gap-2 truncate">
                    <CalendarIcon className="size-4 text-muted-foreground shrink-0" />
                    <span>{formattedDisplay || placeholder}</span>
                </span>
                <ChevronDownIcon className="size-4 text-muted-foreground opacity-60 shrink-0 ml-2" />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border border-border shadow-md rounded-lg overflow-hidden" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                        if (d) {
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, "0");
                            const day = String(d.getDate()).padStart(2, "0");
                            onChange?.(`${y}-${m}-${day}`);
                        } else {
                            onChange?.("");
                        }
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
