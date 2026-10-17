"use client";

import * as React from "react";
import { Calendar, FilterX } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface AnalysisDateFilterProps {
    fromDate: string;
    toDate: string;
    minDate?: string;
    maxDate?: string;
    onFromDateChange: (val: string) => void;
    onToDateChange: (val: string) => void;
    onClear: () => void;
}

export function AnalysisDateFilter({
    fromDate,
    toDate,
    minDate,
    maxDate,
    onFromDateChange,
    onToDateChange,
    onClear,
}: AnalysisDateFilterProps) {
    const hasFilter = Boolean(fromDate || toDate);

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground px-1">
                <Calendar className="size-3.5" />
                <span className="font-medium">Date Range:</span>
            </div>

            <div className="flex items-center gap-1.5">
                <Input
                    type="date"
                    value={fromDate}
                    min={minDate}
                    max={toDate || maxDate}
                    onChange={(e) => onFromDateChange(e.target.value)}
                    className="h-8 text-xs w-36 px-2"
                    aria-label="From Date"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                    type="date"
                    value={toDate}
                    min={fromDate || minDate}
                    max={maxDate}
                    onChange={(e) => onToDateChange(e.target.value)}
                    className="h-8 text-xs w-36 px-2"
                    aria-label="To Date"
                />
            </div>

            {hasFilter && (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onClear}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                    <FilterX className="size-4" />
                    <span>Reset</span>
                </Button>
            )}
        </div>
    );
}
