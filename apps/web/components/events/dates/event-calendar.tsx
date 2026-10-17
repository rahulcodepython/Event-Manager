"use client";

import * as React from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "cn";
import { Button } from "../../ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../ui/hover-card";
import { DateScheduleMap, formatTime12Hour, toDateKey } from "../../../lib/date-utils";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface EventCalendarProps {
    currentMonth: Date;
    onMonthChange: (newMonth: Date) => void;
    eventStartDate: string;
    eventEndDate: string;
    stagedDates: DateScheduleMap;
    onToggleDate: (date: Date) => void;
    onContextMenu: (date: Date) => void;
}

interface CalendarCell {
    date: Date;
    dateKey: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isDisabled: boolean;
    isSelected: boolean;
    isCustom: boolean;
    startTime?: string;
    endTime?: string;
}

export function EventCalendar({
    currentMonth,
    onMonthChange,
    eventStartDate,
    eventEndDate,
    stagedDates,
    onToggleDate,
    onContextMenu,
}: EventCalendarProps) {
    const year = currentMonth.getFullYear();
    const monthIndex = currentMonth.getMonth();

    const handlePrevMonth = () => onMonthChange(new Date(year, monthIndex - 1, 1));
    const handleNextMonth = () => onMonthChange(new Date(year, monthIndex + 1, 1));

    // Build a flat, always-complete-weeks grid in one pass. JS's Date happily
    // rolls negative/overflowing day numbers into the previous/next month, so
    // a single offset loop covers the "leading days / month days / trailing
    // days" cases that used to be three separate loops with duplicated cell logic.
    const weeks = React.useMemo(() => {
        const firstWeekday = new Date(year, monthIndex, 1).getDay();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

        const cells: CalendarCell[] = Array.from({ length: totalCells }, (_, i) => {
            const date = new Date(year, monthIndex, i - firstWeekday + 1);
            const dateKey = toDateKey(date);
            const isCurrentMonth = date.getMonth() === monthIndex;
            const inRange = dateKey >= eventStartDate && dateKey <= eventEndDate;
            const staged = stagedDates[dateKey];

            return {
                date,
                dateKey,
                dayNumber: date.getDate(),
                isCurrentMonth,
                isDisabled: !isCurrentMonth || !inRange,
                isSelected: Boolean(staged),
                isCustom: Boolean(staged?.isCustom),
                startTime: staged?.startTime,
                endTime: staged?.endTime,
            };
        });

        const grid: CalendarCell[][] = [];
        for (let i = 0; i < cells.length; i += 7) {
            grid.push(cells.slice(i, i + 7));
        }
        return grid;
    }, [year, monthIndex, eventStartDate, eventEndDate, stagedDates]);

    return (
        <div className="flex w-full flex-col gap-4">
            {/* Month Navigator Toolbar */}
            <div className="flex w-full items-center justify-between px-2 py-1">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevMonth}
                    title="Previous month"
                    className="gap-2 text-xs font-medium"
                >
                    <ChevronLeft className="size-4" />
                    <span>Previous</span>
                </Button>
                <span className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    {format(currentMonth, "MMMM yyyy")}
                </span>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleNextMonth}
                    title="Next month"
                    className="gap-2 text-xs font-medium"
                >
                    <span>Next</span>
                    <ChevronRight className="size-4" />
                </Button>
            </div>

            {/* Calendar Table */}
            <div className="w-full">
                <table className="w-full table-fixed border-collapse">
                    <thead>
                        <tr>
                            {
                                WEEKDAY_NAMES.map((name) => <th key={name} className="py-2 text-center text-xs sm:text-sm font-semibold text-muted-foreground select-none">
                                    {name}
                                </th>
                                )
                            }
                        </tr>
                    </thead>
                    <tbody>
                        {
                            weeks.map((week, wIdx) => <tr key={wIdx}>
                                {
                                    week.map((cell) => {
                                        const button = (
                                            <button
                                                type="button"
                                                disabled={cell.isDisabled}
                                                onClick={() => onToggleDate(cell.date)}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    if (!cell.isDisabled) onContextMenu(cell.date);
                                                }}
                                                className={cn(
                                                    "relative w-full aspect-square min-h-13.5 sm:min-h-16 max-w-19 rounded-md font-bold text-base sm:text-lg transition-all flex flex-col items-center justify-center select-none mx-auto",
                                                    !cell.isCurrentMonth && "text-muted-foreground/20 opacity-20 cursor-default",
                                                    cell.isCurrentMonth && cell.isDisabled && "text-muted-foreground/30 opacity-30 cursor-not-allowed",
                                                    cell.isCurrentMonth && !cell.isDisabled && !cell.isSelected && "text-foreground hover:bg-muted/70 cursor-pointer",
                                                    cell.isSelected && "bg-primary text-primary-foreground font-bold shadow-sm cursor-pointer"
                                                )}
                                            >
                                                <span>{cell.dayNumber}</span>
                                                {
                                                    cell.isSelected && <span
                                                        className={cn(
                                                            "absolute bottom-1.5 size-2 rounded-md ring-1 ring-background",
                                                            cell.isCustom ? "bg-amber-400" : "bg-primary-foreground"
                                                        )}
                                                        title={cell.isCustom ? "Custom hours set" : "Scheduled"}
                                                    />
                                                }
                                            </button>
                                        );

                                        return (
                                            <td key={cell.dateKey} className="p-1 sm:p-1.5 text-center">
                                                {
                                                    cell.isDisabled ? button
                                                        : <HoverCard>
                                                            <HoverCardTrigger>{button}</HoverCardTrigger>
                                                            <HoverCardContent className="w-48 text-xs" side="top">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="font-semibold text-foreground">
                                                                        {format(cell.date, "EEEE, MMM d")}
                                                                    </span>
                                                                    {
                                                                        cell.isSelected ? <React.Fragment>
                                                                            <span className="text-muted-foreground">
                                                                                {formatTime12Hour(cell.startTime ?? "")} - {formatTime12Hour(cell.endTime ?? "")}
                                                                            </span>
                                                                            {
                                                                                cell.isCustom && <span className="text-[10px] font-medium text-amber-500">
                                                                                    Custom hours
                                                                                </span>
                                                                            }
                                                                        </React.Fragment>
                                                                            : <span className="text-muted-foreground">Not scheduled</span>
                                                                    }
                                                                </div>
                                                            </HoverCardContent>
                                                        </HoverCard>
                                                }
                                            </td>
                                        );
                                    })
                                }
                            </tr>
                            )
                        }
                    </tbody>
                </table>
            </div >
        </div >
    );
}