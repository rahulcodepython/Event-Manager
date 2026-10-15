"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Eye, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../ui/button";
import { StagedDatesPreviewDialog } from "./staged-dates-preview-dialog";
import { parseCSVObjects } from "../../../lib/csv";
import type { EventDateItemInput } from "../../../schema/event-dates.types";

export interface FileUploadSectionProps {
    eventStartDate: string;
    eventEndDate: string;
    /** Add/merge parsed dates into calendar staging without saving. */
    onApplyDates?: (dates: EventDateItemInput[]) => void;
    /** Replace all saved dates with the parsed set (used instead of onApplyDates when provided). */
    onOverrideDates?: (dates: EventDateItemInput[]) => Promise<void>;
    isReplacing?: boolean;
}

type ParseStatus = "idle" | "parsing" | "accepted" | "error";
type FileKind = "json" | "csv";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

type RawRow = { date: unknown; start_time: unknown; end_time: unknown };

function validateRow(
    row: RawRow,
    label: string,
    eventStartDate: string,
    eventEndDate: string
): { data: EventDateItemInput } | { error: string } {
    const date = String(row.date ?? "").trim();
    const startTime = String(row.start_time ?? "").trim();
    const endTime = String(row.end_time ?? "").trim();

    if (!DATE_RE.test(date)) {
        return { error: `${label}: Invalid date format "${date}" (expected YYYY-MM-DD)` };
    }
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
        return { error: `${label} (${date}): Times must match HH:MM format` };
    }
    if (endTime < startTime) {
        return { error: `${label} (${date}): End time cannot be earlier than start time` };
    }
    if (date < eventStartDate || date > eventEndDate) {
        return { error: `${label} (${date}): Out of event range [${eventStartDate} to ${eventEndDate}]` };
    }
    return { data: { date, start_time: startTime, end_time: endTime } };
}

function parseJSONRows(text: string): RawRow[] {
    const raw = JSON.parse(text);
    if (!Array.isArray(raw)) throw new Error("Invalid JSON: Root must be an array of date objects");

    return raw.map((item) => {
        const obj = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        return {
            date: obj.date,
            start_time: obj.start_time ?? obj.startTime,
            end_time: obj.end_time ?? obj.endTime,
        };
    });
}

function parseCSVRows(text: string): RawRow[] {
    const rows = parseCSVObjects(text);
    if (rows.length === 0) {
        throw new Error("CSV must contain a header row and at least one data row");
    }
    if (!("date" in rows[0]) || !("start_time" in rows[0]) || !("end_time" in rows[0])) {
        throw new Error('CSV header must contain "date", "start_time", and "end_time"');
    }
    return rows.map((r) => ({ date: r.date, start_time: r.start_time, end_time: r.end_time }));
}

export function FileUploadSection({
    eventStartDate,
    eventEndDate,
    onApplyDates,
    onOverrideDates,
    isReplacing = false,
}: FileUploadSectionProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [status, setStatus] = React.useState<ParseStatus>("idle");
    const [statusMessage, setStatusMessage] = React.useState("No file chosen");
    const [parsedItems, setParsedItems] = React.useState<EventDateItemInput[]>([]);
    const [previewOpen, setPreviewOpen] = React.useState(false);

    const parseFile = async (file: File, kind: FileKind) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setStatus("error");
            setStatusMessage("File size exceeds 2MB limit");
            return;
        }

        setStatus("parsing");
        setStatusMessage(`Parsing ${kind.toUpperCase()} file...`);

        try {
            const text = await file.text();
            const rows = kind === "json" ? parseJSONRows(text) : parseCSVRows(text);

            const results: EventDateItemInput[] = [];
            for (let i = 0; i < rows.length; i++) {
                const result = validateRow(rows[i], `Row ${i + 1}`, eventStartDate, eventEndDate);
                if ("error" in result) {
                    setStatus("error");
                    setStatusMessage(result.error);
                    return;
                }
                results.push(result.data);
            }

            if (results.length === 0) {
                setStatus("error");
                setStatusMessage(`${kind.toUpperCase()} file contains no date entries`);
                return;
            }

            setParsedItems(results);
            setStatus("accepted");
            setStatusMessage(`Data accepted: ${results.length} valid date entries parsed`);
            toast.success(`Parsed ${results.length} dates from ${kind.toUpperCase()}`);
        } catch (err) {
            setStatus("error");
            setStatusMessage(err instanceof Error ? err.message : `Failed to parse ${kind.toUpperCase()} file`);
        }
    };

    const handleFileSelected = (file: File) => {
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith(".json") || file.type === "application/json") {
            parseFile(file, "json");
        } else if (lowerName.endsWith(".csv") || file.type === "text/csv") {
            parseFile(file, "csv");
        } else {
            setStatus("error");
            setStatusMessage("Invalid file type. Please choose a .json or .csv file.");
        }
    };

    const handleApply = () => {
        if (parsedItems.length === 0 || !onApplyDates) return;
        onApplyDates(parsedItems);
        toast.success(`Imported ${parsedItems.length} dates to calendar staging`);
    };

    const handleOverride = async () => {
        if (parsedItems.length === 0 || !onOverrideDates) return;
        await onOverrideDates(parsedItems);
    };

    // Overriding takes priority when the parent supports it; otherwise fall back to staging-only apply.
    const runPrimaryAction = onOverrideDates ? handleOverride : async () => handleApply();
    const primaryLabel = onOverrideDates ? isReplacing ? "Overriding..." : "Override All Dates" : "Apply to Calendar";

    return (
        <div className="flex flex-col gap-3 rounded-md border bg-card p-4">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-foreground">Import from File</span>
                <p className="text-[11px] text-muted-foreground">
                    Upload a JSON or CSV file to override all dates and schedules (max 2MB).
                </p>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                accept=".json,.csv,application/json,text/csv"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                    e.target.value = "";
                }}
            />

            <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload className="size-4 text-primary" />
                <span>Choose File (JSON or CSV)</span>
            </Button>

            <div
                className={`flex items-start gap-2 p-2.5 text-xs ${status === "parsing"
                    ? "bg-muted text-muted-foreground"
                    : status === "accepted"
                        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : status === "error"
                            ? "border border-destructive/20 bg-destructive/10 text-destructive"
                            : "bg-muted/40 text-muted-foreground"
                    }`}>
                {status === "parsing" && <Loader2 className="mt-0.5 size-3.5 animate-spin" />}
                {status === "accepted" && <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />}
                {status === "error" && <AlertCircle className="mt-0.5 size-3.5 shrink-0" />}
                <span className="leading-tight">{statusMessage}</span>
            </div>

            {status === "accepted" && parsedItems.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1 gap-1.5"
                        onClick={() => setPreviewOpen(true)}
                    >
                        <Eye className="size-4" />
                        <span>Preview ({parsedItems.length})</span>
                    </Button>
                    <Button
                        type="button"
                        disabled={isReplacing}
                        className="flex-1 gap-1.5"
                        onClick={runPrimaryAction}
                    >
                        {isReplacing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                        <span>{primaryLabel}</span>
                    </Button>
                </div>
            )}

            <StagedDatesPreviewDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                title="Preview File Import Data"
                description={`Review ${parsedItems.length} dates parsed from the uploaded file before applying.`}
                items={parsedItems.map((p) => ({
                    date: p.date,
                    startTime: p.start_time,
                    endTime: p.end_time,
                    changeType: "added",
                }))}
                actionLabel={onOverrideDates ? "Upload & Override All Dates" : "Apply to Calendar"}
                isActionPending={isReplacing}
                onAction={async () => {
                    await runPrimaryAction();
                    setPreviewOpen(false);
                }}
            />
        </div>
    );
}