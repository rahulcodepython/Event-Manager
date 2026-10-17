"use client";

import * as React from "react";
import { Clock8Icon } from "lucide-react";
import { Input } from "./input";
import { cn } from "../../lib/utils";

export interface TimePickerProps
    extends Omit<React.ComponentProps<"input">, "type" | "onChange"> {
    value?: string;
    onChange?: (timeString: string) => void;
}

export function TimePicker({
    value = "",
    onChange,
    className,
    disabled,
    placeholder = "HH:MM",
    ...props
}: TimePickerProps) {
    return (
        <div className="relative w-full">
            <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3">
                <Clock8Icon className="size-4 text-muted-foreground" />
                <span className="sr-only">Time picker icon</span>
            </div>
            <Input
                type="time"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange?.(e.target.value)}
                className={cn(
                    "peer pl-9 h-10 text-sm bg-background/50 font-mono",
                    className
                )}
                placeholder={placeholder}
                {...props}
            />
        </div>
    );
}
