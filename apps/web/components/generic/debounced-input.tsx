"use client";

import * as React from "react";
import { SearchIcon } from "lucide-react";

import { Input } from "../ui/input";
import { cn } from "../../lib/utils";

export interface DebouncedInputProps
    extends Omit<React.ComponentProps<typeof Input>, "onChange"> {
    value?: string;
    onChange: (value: string) => void;
    debounceMs?: number;
    showSearchIcon?: boolean;
}

export function DebouncedInput({
    value: initialValue = "",
    onChange,
    debounceMs = 300,
    showSearchIcon = true,
    className,
    placeholder = "Search...",
    ...props
}: DebouncedInputProps) {
    const [value, setValue] = React.useState(initialValue);

    React.useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            onChange(value.trim());
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [value, debounceMs, onChange]);

    return (
        <div className="relative w-full max-w-sm">
            {showSearchIcon && (
                <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
                {...props}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className={cn(showSearchIcon && "pl-8", className)}
            />
        </div>
    );
}
