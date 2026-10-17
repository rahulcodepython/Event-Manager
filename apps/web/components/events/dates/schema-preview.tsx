"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../ui/button";
import type { EventDate } from "../../../schema/event-dates.types";

const JSON_SCHEMA_EXAMPLE = `[
    {
        "date": "2026-10-15",
        "start_time": "09:00",
        "end_time": "18:00"
    },
    {
        "date": "2026-10-16",
        "start_time": "10:00",
        "end_time": "17:30"
    }
]`;

const CSV_SCHEMA_EXAMPLE = `date,start_time,end_time
2026-10-15,09:00,18:00
2026-10-16,10:00,17:30`;

type SourceMode = "template" | "saved";
type ViewFormat = "json" | "csv";

/** Small segmented-control used for both the source and format toggles below. */
function TabGroup<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}) {
    return (
        <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-0.5 text-xs">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={`rounded-md px-2 py-1 font-medium transition-colors ${value === opt.value
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

export interface SchemaPreviewProps {
    currentDates: EventDate[];
}

export function SchemaPreview({ currentDates }: SchemaPreviewProps) {
    const [viewFormat, setViewFormat] = React.useState<ViewFormat>("json");
    const [sourceMode, setSourceMode] = React.useState<SourceMode>("template");
    const [hasCopied, setHasCopied] = React.useState(false);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const [maxLines, setMaxLines] = React.useState(8);

    const activeFullContent = React.useMemo(() => {
        if (sourceMode === "template") {
            return viewFormat === "json" ? JSON_SCHEMA_EXAMPLE : CSV_SCHEMA_EXAMPLE;
        }
        if (currentDates.length === 0) {
            return viewFormat === "json" ? "[]" : "date,start_time,end_time";
        }
        if (viewFormat === "json") {
            return JSON.stringify(
                currentDates.map((d) => ({ date: d.date, start_time: d.start_time, end_time: d.end_time })),
                null,
                4
            );
        }
        return [
            "date,start_time,end_time",
            ...currentDates.map((d) => `${d.date},${d.start_time},${d.end_time}`),
        ].join("\n");
    }, [sourceMode, viewFormat, currentDates]);

    // Measure container height to calculate how many lines fit without scrollbars.
    React.useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const updateLines = () => {
            if (el.clientHeight > 0) {
                // 18px line height, 24px vertical padding
                setMaxLines(Math.max(4, Math.floor((el.clientHeight - 24) / 18)));
            }
        };

        updateLines();
        const observer = new ResizeObserver(updateLines);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Truncate with a middle ellipsis when content exceeds what fits in the box.
    const displayContent = React.useMemo(() => {
        const lines = activeFullContent.split("\n");
        if (lines.length <= maxLines) return activeFullContent;

        const available = maxLines - 1; // reserve 1 line for the ellipsis
        const headCount = Math.max(1, Math.floor(available / 2));
        const tailCount = Math.max(1, available - headCount);

        return [...lines.slice(0, headCount), "    ....", ...lines.slice(lines.length - tailCount)].join("\n");
    }, [activeFullContent, maxLines]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(activeFullContent);
            setHasCopied(true);
            toast.success("Copied full content to clipboard");
            setTimeout(() => setHasCopied(false), 2000);
        } catch {
            toast.error("Failed to copy content");
        }
    };

    return (
        <div className="flex flex-col gap-3 h-full">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <TabGroup
                    value={sourceMode}
                    onChange={setSourceMode}
                    options={[
                        { value: "template", label: "Schema Template" },
                        { value: "saved", label: `Saved Data (${currentDates.length})` },
                    ]}
                />

                <div className="flex items-center gap-2">
                    <TabGroup
                        value={viewFormat}
                        onChange={setViewFormat}
                        options={[
                            { value: "json", label: "JSON" },
                            { value: "csv", label: "CSV" },
                        ]}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={handleCopy}
                        title="Copy full un-truncated code"
                    >
                        {hasCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </Button>
                </div>
            </div>

            <div
                ref={containerRef}
                className="relative h-full rounded-md border bg-muted/30 p-3 overflow-hidden font-mono text-[11px] leading-4.5 text-muted-foreground"
            >
                <pre className="overflow-hidden whitespace-pre">{displayContent}</pre>
            </div>
        </div>
    );
}