"use client";

import * as React from "react";
import { Eye, Save } from "lucide-react";

import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";

export interface CalendarActionBarProps {
    selectedCount: number;
    stagedCount: number;
    isPending: boolean;
    onPreviewStaged: () => void;
    onBulkSave: () => void;
}

export function CalendarActionBar({
    selectedCount,
    stagedCount,
    isPending,
    onPreviewStaged,
    onBulkSave,
}: CalendarActionBarProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                    Selected: <strong>{selectedCount}</strong> dates
                </span>
                {
                    stagedCount > 0 && <Badge variant="secondary" className="text-[10px]">
                        {stagedCount} staged changes
                    </Badge>
                }
            </div>

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={onPreviewStaged}
                >
                    <Eye className="size-4" />
                    <span>Preview Staged ({stagedCount})</span>
                </Button>

                <Button
                    type="button"
                    className="gap-2"
                    disabled={stagedCount === 0 || isPending}
                    onClick={onBulkSave}
                >
                    <Save className="size-4" />
                    <span>{isPending ? "Saving..." : "Bulk Save"}</span>
                </Button>
            </div>
        </div>
    );
}