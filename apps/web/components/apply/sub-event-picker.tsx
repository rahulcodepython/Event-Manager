"use client";

import * as React from "react";

import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { daysSummary } from "../../lib/sub-events";
import { cn } from "../../lib/utils";
import type { PublicSubEventOption } from "../../schema/publicapply.types";

/** Sub-event choice on the public form: pick one or any number. */
export function SubEventPicker({ mode, required, options, value, error, onChange }: {
    mode: "one" | "many" | "off";
    required: boolean;
    options: PublicSubEventOption[];
    value: string[];
    error: string | null;
    onChange: (ids: string[]) => void;
}) {
    const toggle = (id: string) => {
        if (mode === "one") {
            onChange(value.includes(id) ? [] : [id]);
            return;
        }
        onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    };

    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium">
                {mode === "one" ? "Choose a sub-event" : "Choose sub-events"}
                {
                    required && <span className="text-destructive"> *</span>
                }
            </Label>
            <div className="flex flex-col gap-2">
                {
                    options.map((o) => {
                        const checked = value.includes(o.id);
                        const disabled = o.is_full && !checked;
                        return <label
                            key={o.id}
                            className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors",
                                checked && "border-primary bg-primary/5",
                                disabled && "cursor-not-allowed opacity-60",
                            )}
                        >
                            <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggle(o.id)} className="mt-0.5" />
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="font-medium">
                                    {o.name}
                                    {
                                        o.is_full && <span className="ml-2 text-xs text-destructive">Full</span>
                                    }
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {[daysSummary(o.days), o.venue].filter(Boolean).join(" · ")}
                                </span>
                                {
                                    o.description && <span className="text-xs text-muted-foreground">{o.description}</span>
                                }
                            </div>
                        </label>;
                    })
                }
            </div>
            {
                error && <p className="text-xs font-medium text-destructive">{error}</p>
            }
        </div>
    );
}
