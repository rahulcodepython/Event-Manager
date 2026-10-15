"use client";

import * as React from "react";
import { CalendarDays, Loader2 } from "lucide-react";

import {
    AnalysisAttendeesTable,
    type AvailableDateOption,
} from "../../../../../components/analysis/analysis-attendees-table";
import { AnalysisDateFilter } from "../../../../../components/analysis/analysis-date-filter";
import { AnalysisDateLineChart } from "../../../../../components/analysis/analysis-date-line-chart";
import { AnalysisOverviewPieChart } from "../../../../../components/analysis/analysis-overview-pie-chart";
import { AnalysisPunctualityChart } from "../../../../../components/analysis/analysis-punctuality-chart";
import { Card, CardContent } from "../../../../../components/ui/card";
import { useEventPage } from "../../../../../components/events/event-context";
import { PageHeader } from "../../../../../components/generic";
import {
    useAttendanceMetricsQuery,
    useAttendeeAnalysisQuery,
} from "../../../../../query-hooks/attendance.api";
import { useAllEventDatesQuery } from "../../../../../query-hooks/event-dates.api";

function getDaysInRange(startStr: string, endStr: string, maxDays = 366): string[] {
    const dates: string[] = [];
    const cur = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(cur.getTime()) || isNaN(end.getTime()) || cur > end) return dates;

    const diffDays = Math.ceil((end.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > maxDays) return dates;

    while (cur <= end) {
        dates.push(cur.toISOString().split("T")[0]);
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

export default function EventAnalysisPage() {
    const { event, eventId } = useEventPage("Analysis");

    const [fromDate, setFromDate] = React.useState("");
    const [toDate, setToDate] = React.useState("");
    const [selectedDate, setSelectedDate] = React.useState("");
    const [search, setSearch] = React.useState("");
    const [status, setStatus] = React.useState("all");
    const [page, setPage] = React.useState(1);

    const { data: allEventDates } = useAllEventDatesQuery(eventId);


    const hasDateRange = Boolean(fromDate && toDate);

    // Compute session dates strictly between fromDate and toDate
    const availableDates: AvailableDateOption[] = React.useMemo(() => {
        if (!fromDate || !toDate) return [];

        const scheduledInRange = (allEventDates || [])
            .filter((d) => d.date >= fromDate && d.date <= toDate)
            .sort((a, b) => a.date.localeCompare(b.date));

        if (scheduledInRange.length > 0) {
            return scheduledInRange.map((d) => ({
                date: d.date,
                start_time: d.start_time,
                end_time: d.end_time,
            }));
        }

        return getDaysInRange(fromDate, toDate).map((dt) => ({
            date: dt,
            start_time: null,
            end_time: null,
        }));
    }, [allEventDates, fromDate, toDate]);

    // First API call: Attendance & punctuality charts metrics (only when date range is selected)
    const {
        data: metrics,
        isLoading: isMetricsLoading,
    } = useAttendanceMetricsQuery(
        eventId,
        { fromDate, toDate },
        { enabled: Boolean(eventId && hasDateRange) },
    );

    // Second API call: Paginated attendee audit records (only when specific session date is selected)
    const {
        data: attendeesData,
        isLoading: isAttendeesLoading,
    } = useAttendeeAnalysisQuery(
        eventId,
        {
            search,
            status,
            fromDate,
            toDate,
            selectedDate,
            page,
            limit: 15,
        },
        { enabled: Boolean(eventId && hasDateRange && selectedDate) },
    );

    const handleFromDateChange = (val: string) => {
        setFromDate(val);
        setSelectedDate("");
        setPage(1);
    };

    const handleToDateChange = (val: string) => {
        setToDate(val);
        setSelectedDate("");
        setPage(1);
    };

    const handleClearDateFilter = () => {
        setFromDate("");
        setToDate("");
        setSelectedDate("");
        setPage(1);
    };

    const handleSelectedDateChange = (val: string) => {
        setSelectedDate(val);
        setPage(1);
    };

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setPage(1);
    };

    const handleStatusChange = (val: string) => {
        setStatus(val);
        setPage(1);
    };

    return (
        <>
            <PageHeader
                title="Event Analysis"
                description={`Turnout breakdown, date trends, and attendee punctuality for ${event.name}.`}
                actions={
                    <AnalysisDateFilter
                        fromDate={fromDate}
                        toDate={toDate}
                        minDate={event.start_date}
                        maxDate={event.end_date}
                        onFromDateChange={handleFromDateChange}
                        onToDateChange={handleToDateChange}
                        onClear={handleClearDateFilter}
                    />
                }
            />

            {/* Charts Section */}
            {
                !hasDateRange ? <Card className="border-dashed border-border/80 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                            <CalendarDays className="size-6" />
                        </div>
                        <h2 className="text-sm font-semibold text-foreground">
                            Select a Date Range to Begin Analysis
                        </h2>
                        <p className="text-xs text-muted-foreground max-w-sm mt-1">
                            Choose a start and end date above to view attendance metrics, turnout distribution, and daily attendee lists.
                        </p>
                    </CardContent>
                </Card> : isMetricsLoading ? <div className="flex h-52 items-center justify-center rounded-xl border bg-muted/20">
                    <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="size-5 animate-spin text-primary" />
                        <span>Loading analysis metrics...</span>
                    </div>
                </div> : metrics && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <AnalysisOverviewPieChart overview={metrics.overview} />
                    <AnalysisDateLineChart data={metrics.by_date} />
                    <AnalysisPunctualityChart punctuality={metrics.punctuality} />
                </div>
            }

            {/* Paginated Attendees Roster Section */}
            <AnalysisAttendeesTable
                data={attendeesData?.data || []}
                total={attendeesData?.total || 0}
                page={attendeesData?.page || 1}
                limit={attendeesData?.limit || 15}
                search={search}
                status={status}
                hasDateRange={hasDateRange}
                selectedDate={selectedDate}
                availableDates={availableDates}
                onSearchChange={handleSearchChange}
                onStatusChange={handleStatusChange}
                onSelectedDateChange={handleSelectedDateChange}
                onPageChange={setPage}
                isLoading={isAttendeesLoading}
            />
        </>
    );
}
