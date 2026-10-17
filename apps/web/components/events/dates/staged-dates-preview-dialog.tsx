"use client";

import * as React from "react";
import { CalendarDays, Clock } from "lucide-react";

import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../ui/dialog";

export interface StagedDateItem {
    date: string;
    startTime: string;
    endTime: string;
    isCustom?: boolean;
    changeType?: "added" | "updated" | "removed";
}

export interface StagedDatesPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    items: StagedDateItem[];
    actionLabel?: string;
    onAction?: () => void;
    isActionPending?: boolean;
}

export function StagedDatesPreviewDialog({
    open,
    onOpenChange,
    title = "Preview Staged Changes",
    description = "Review the dates and schedule hours staged for bulk operations.",
    items,
    actionLabel,
    onAction,
    isActionPending = false,
}: StagedDatesPreviewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <CalendarDays className="size-4" />
                        </div>
                        <DialogTitle>{title}</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                            <span>No changes staged for bulk operations.</span>
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y rounded-md border">
                            {items.map((item) => (
                                <div
                                    key={item.date}
                                    className="flex items-center justify-between p-3 text-xs"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="font-medium text-foreground">
                                            {item.date}
                                        </span>
                                        {item.changeType && (
                                            <Badge
                                                className="text-[10px] uppercase"
                                                variant={
                                                    item.changeType === "removed"
                                                        ? "destructive"
                                                        : item.changeType === "added"
                                                            ? "default"
                                                            : "secondary"
                                                }
                                            >
                                                {item.changeType}
                                            </Badge>
                                        )}
                                        {item.isCustom && (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px]"
                                            >
                                                Custom
                                            </Badge>
                                        )}
                                    </div>

                                    {item.changeType !== "removed" && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="size-3.5" />
                                            <span>
                                                {item.startTime} - {item.endTime}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </DialogBody>

                <DialogFooter className="gap-2 sm:justify-between">
                    <div className="text-xs text-muted-foreground">
                        Total Staged: {items.length} {items.length === 1 ? "date" : "dates"}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Close
                        </Button>
                        {
                            onAction && actionLabel && <Button
                                type="button"
                                disabled={items.length === 0 || isActionPending}
                                onClick={onAction}
                            >
                                {isActionPending ? "Saving..." : actionLabel}
                            </Button>
                        }
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}