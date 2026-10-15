"use client";

import * as React from "react";
import { parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

import { useEventPage } from "../../../../../components/events/event-context";
import { PageHeader } from "../../../../../components/generic";
import { Badge } from "../../../../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { queryKeys } from "../../../../../react-query/query-keys";
import {
    useBulkUpdateEventDatesMutation,
    useEventDatesQuery,
    useOverrideEventDatesMutation,
} from "../../../../../query-hooks/event-dates.api";
import type { EventDate, EventDateItemInput } from "../../../../../schema/event-dates.types";
import { DateScheduleMap, isCustomSchedule, isDateInRange, toDateKey, toMonthKey } from "../../../../../lib/date-utils";
import { StagedDateItem, StagedDatesPreviewDialog } from "../../../../../components/events/dates/staged-dates-preview-dialog";
import { DefaultTimeBar } from "../../../../../components/events/dates/default-time-bar";
import { EventCalendar } from "../../../../../components/events/dates/event-calendar";
import { CalendarActionBar } from "../../../../../components/events/dates/calendar-action-bar";
import { SchemaPreview } from "../../../../../components/events/dates/schema-preview";
import { FileUploadSection } from "../../../../../components/events/dates/file-upload-section";
import { TimeDialog } from "../../../../../components/events/dates/time-dialog";

/** Builds an EventDate record for the cache, reusing an existing record's id/created_at when present. */
function toEventDate(eventId: string, item: EventDateItemInput, existing?: EventDate): EventDate {
    const now = new Date().toISOString();
    return {
        id: existing?.id ?? crypto.randomUUID(),
        event_id: eventId,
        date: item.date,
        start_time: item.start_time,
        end_time: item.end_time,
        created_at: existing?.created_at ?? now,
        updated_at: now,
    };
}

export default function EventDatesPage() {
    const { event, eventId } = useEventPage("Dates & Schedule");
    const queryClient = useQueryClient();


    // Active calendar viewing month
    const initialMonth = React.useMemo(() => {
        try {
            return event.start_date ? parseISO(event.start_date) : new Date();
        } catch {
            return new Date();
        }
    }, [event.start_date]);

    const [currentMonth, setCurrentMonth] = React.useState<Date>(initialMonth);
    const monthKey = toMonthKey(currentMonth);

    // Global default times applied to newly selected dates
    const [defaultStartTime, setDefaultStartTime] = React.useState("09:00");
    const [defaultEndTime, setDefaultEndTime] = React.useState("18:00");

    // Staging state for dates in the calendar
    const [stagedDates, setStagedDates] = React.useState<DateScheduleMap>({});

    // Track which months have been initialized from server to prevent background refetches from resurrecting deselected dates
    const initializedMonths = React.useRef<Set<string>>(new Set());

    // Dialog states
    const [customTimeDialogDate, setCustomTimeDialogDate] = React.useState<string | null>(null);
    const [isCustomTimeDialogOpen, setIsCustomTimeDialogOpen] = React.useState(false);
    const [isStagedPreviewOpen, setIsStagedPreviewOpen] = React.useState(false);

    // React query for current month's saved dates
    const { data: savedDatesData } = useEventDatesQuery(eventId, monthKey);
    const savedDates = React.useMemo(() => savedDatesData ?? [], [savedDatesData]);
    const bulkUpdateMutation = useBulkUpdateEventDatesMutation(eventId);
    const overrideMutation = useOverrideEventDatesMutation(eventId);

    // Saved dates map for this month
    const savedDatesMap = React.useMemo(() => {
        const map: Record<string, { startTime: string; endTime: string }> = {};
        for (const d of savedDates) {
            map[d.date] = { startTime: d.start_time, endTime: d.end_time };
        }
        return map;
    }, [savedDates]);

    const toSchedule = React.useCallback(
        (startTime: string, endTime: string) => ({
            startTime,
            endTime,
            isCustom: isCustomSchedule(startTime, endTime, defaultStartTime, defaultEndTime),
        }),
        [defaultStartTime, defaultEndTime]
    );

    // Initialize month in stagedDates when first loaded from server
    React.useEffect(() => {
        if (!savedDatesData || initializedMonths.current.has(monthKey)) return;

        setStagedDates((prev) => {
            const next = { ...prev };
            for (const d of savedDatesData) {
                next[d.date] = toSchedule(d.start_time, d.end_time);
            }
            return next;
        });
        initializedMonths.current.add(monthKey);
    }, [savedDatesData, monthKey, toSchedule]);

    const isWithinEventRange = React.useCallback(
        (dateStr: string) => isDateInRange(dateStr, event.start_date, event.end_date),
        [event.start_date, event.end_date]
    );

    // Toggle date selection
    const handleToggleDate = (date: Date) => {
        const dateStr = toDateKey(date);
        if (!isWithinEventRange(dateStr)) return;

        setStagedDates((prev) => {
            const next = { ...prev };
            if (next[dateStr]) {
                delete next[dateStr];
            } else {
                next[dateStr] = toSchedule(defaultStartTime, defaultEndTime);
            }
            return next;
        });
    };

    // Right-click date cell
    const handleContextMenu = (date: Date) => {
        const dateStr = toDateKey(date);
        if (!isWithinEventRange(dateStr)) return;

        setCustomTimeDialogDate(dateStr);
        setIsCustomTimeDialogOpen(true);
    };

    // Save custom time
    const handleSaveCustomTime = (dateStr: string, startTime: string, endTime: string) => {
        setStagedDates((prev) => ({ ...prev, [dateStr]: toSchedule(startTime, endTime) }));
    };

    // Reset date to default time
    const handleResetDateToDefault = (dateStr: string) => {
        setStagedDates((prev) => {
            if (!prev[dateStr]) return prev;
            return { ...prev, [dateStr]: { startTime: defaultStartTime, endTime: defaultEndTime, isCustom: false } };
        });
    };

    // Apply imported dates from file upload
    const handleApplyImportedDates = (imported: EventDateItemInput[]) => {
        setStagedDates((prev) => {
            const next = { ...prev };
            for (const item of imported) {
                if (isWithinEventRange(item.date)) {
                    next[item.date] = toSchedule(item.start_time, item.end_time);
                }
            }
            return next;
        });
    };

    // Override all dates (called by file upload section)
    const handleOverrideDates = async (newDates: EventDateItemInput[]) => {
        try {
            await overrideMutation.mutateAsync({ dates: newDates });

            const nextStaged: DateScheduleMap = {};
            for (const d of newDates) {
                nextStaged[d.date] = toSchedule(d.start_time, d.end_time);
            }
            setStagedDates(nextStaged);

            const currentMonthDates = newDates
                .filter((d) => d.date.startsWith(monthKey))
                .map((d) => toEventDate(eventId, d));
            queryClient.setQueryData(queryKeys.eventDates.byMonth(eventId, monthKey), currentMonthDates);

            initializedMonths.current = new Set([monthKey]);
        } catch {
            // Handled by overrideMutation onError toast
        }
    };

    // Bulk Save all staged dates (atomic delete of deselected + upsert of remaining)
    const handleBulkSave = async () => {
        const datesToUpsert: EventDateItemInput[] = Object.entries(stagedDates).map(([date, val]) => ({
            date,
            start_time: val.startTime,
            end_time: val.endTime,
        }));
        const datesToDelete = Object.keys(savedDatesMap).filter((d) => !stagedDates[d]);

        try {
            await bulkUpdateMutation.mutateAsync({ upsertDates: datesToUpsert, deleteDates: datesToDelete });

            // Immediately update the query cache so UI reflects the exact new state without race conditions
            const updatedSavedDates = datesToUpsert
                .filter((d) => d.date.startsWith(monthKey))
                .map((item) => toEventDate(eventId, item, savedDates.find((s) => s.date === item.date)));
            queryClient.setQueryData(queryKeys.eventDates.byMonth(eventId, monthKey), updatedSavedDates);

            // Ensure deselected dates are cleaned out of stagedDates
            setStagedDates((prev) => {
                const next = { ...prev };
                for (const d of datesToDelete) delete next[d];
                return next;
            });

            initializedMonths.current.add(monthKey);
        } catch {
            // Handled by bulkUpdateMutation onError toast
        }
    };

    // Calculate staged changes for bulk operations
    const stagedChanges: StagedDateItem[] = React.useMemo(() => {
        const list: StagedDateItem[] = [];

        for (const [date, info] of Object.entries(stagedDates)) {
            const saved = savedDatesMap[date];
            if (!saved) {
                list.push({ date, startTime: info.startTime, endTime: info.endTime, isCustom: info.isCustom, changeType: "added" });
            } else if (saved.startTime !== info.startTime || saved.endTime !== info.endTime) {
                list.push({ date, startTime: info.startTime, endTime: info.endTime, isCustom: info.isCustom, changeType: "updated" });
            }
        }
        for (const [date, info] of Object.entries(savedDatesMap)) {
            if (!stagedDates[date]) {
                list.push({ date, startTime: info.startTime, endTime: info.endTime, changeType: "removed" });
            }
        }

        return list.sort((a, b) => a.date.localeCompare(b.date));
    }, [stagedDates, savedDatesMap]);

    return (
        <>
            <PageHeader
                title="Event Dates & Schedule"
                badge={
                    <Badge variant="outline" className="text-xs">
                        {event.start_date} to {event.end_date}
                    </Badge>
                }
                description="Select active event dates on the calendar, configure hours, or batch-import schedules via JSON and CSV."
            />

            {/* Split Layout: Left Card (Calendar), Right Card matches Left Card height */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Calendar Schedule</CardTitle>
                        <CardDescription className="text-sm">
                            Click to toggle date selection. Right-click any cell to assign custom start and end times.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-4">
                        <DefaultTimeBar
                            startTime={defaultStartTime}
                            endTime={defaultEndTime}
                            onStartTimeChange={setDefaultStartTime}
                            onEndTimeChange={setDefaultEndTime}
                        />

                        <div className="rounded-md border bg-card p-3">
                            <EventCalendar
                                currentMonth={currentMonth}
                                onMonthChange={setCurrentMonth}
                                eventStartDate={event.start_date}
                                eventEndDate={event.end_date}
                                stagedDates={stagedDates}
                                onToggleDate={handleToggleDate}
                                onContextMenu={handleContextMenu}
                            />
                        </div>

                        <CalendarActionBar
                            selectedCount={Object.keys(stagedDates).length}
                            stagedCount={stagedChanges.length}
                            isPending={bulkUpdateMutation.isPending}
                            onPreviewStaged={() => setIsStagedPreviewOpen(true)}
                            onBulkSave={handleBulkSave}
                        />
                    </CardContent>
                </Card>

                {/* Right Column: Schema & Import */}
                <Card className="flex flex-col h-full">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Schema & Import</CardTitle>
                        <CardDescription className="text-sm">
                            View schema specifications, inspect current exported data, or bulk-import dates from a file.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-1 flex-col gap-4 justify-between">
                        <SchemaPreview currentDates={savedDates} />

                        <FileUploadSection
                            eventStartDate={event.start_date}
                            eventEndDate={event.end_date}
                            onApplyDates={handleApplyImportedDates}
                            onOverrideDates={handleOverrideDates}
                            isReplacing={overrideMutation.isPending}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Custom Time Modal on Right-Click */}
            {
                customTimeDialogDate && <TimeDialog
                    open={isCustomTimeDialogOpen}
                    onOpenChange={setIsCustomTimeDialogOpen}
                    dateStr={customTimeDialogDate}
                    initialStartTime={stagedDates[customTimeDialogDate]?.startTime || defaultStartTime}
                    initialEndTime={stagedDates[customTimeDialogDate]?.endTime || defaultEndTime}
                    onSave={handleSaveCustomTime}
                    onResetToDefault={handleResetDateToDefault}
                />
            }

            {/* Preview Staged Calendar Changes Modal */}
            <StagedDatesPreviewDialog
                open={isStagedPreviewOpen}
                onOpenChange={setIsStagedPreviewOpen}
                title="Preview Staged Calendar Changes"
                description="Review the dates to be added, modified, or deleted before saving to the database."
                items={stagedChanges}
                actionLabel="Save Changes"
                onAction={async () => {
                    await handleBulkSave();
                    setIsStagedPreviewOpen(false);
                }}
                isActionPending={bulkUpdateMutation.isPending}
            />
        </>
    );
}
