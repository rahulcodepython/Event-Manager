"use client";

import * as React from "react";
import { Clock } from "lucide-react";

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
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

export interface CustomTimeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dateStr: string | null;
    initialStartTime: string;
    initialEndTime: string;
    onSave: (dateStr: string, startTime: string, endTime: string) => void;
    onResetToDefault?: (dateStr: string) => void;
}

export function TimeDialog({
    open,
    onOpenChange,
    dateStr,
    initialStartTime,
    initialEndTime,
    onSave,
    onResetToDefault,
}: CustomTimeDialogProps) {
    const [startTime, setStartTime] = React.useState(initialStartTime);
    const [endTime, setEndTime] = React.useState(initialEndTime);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setStartTime(initialStartTime);
        setEndTime(initialEndTime);
        setError(null);
    }, [initialStartTime, initialEndTime, open]);

    if (!dateStr) return null;

    const handleSave = () => {
        if (!startTime || !endTime) {
            setError("Both start time and end time are required.");
            return;
        }
        if (endTime < startTime) {
            setError("End time cannot be earlier than start time.");
            return;
        }

        setError(null);
        onSave(dateStr, startTime, endTime);
        onOpenChange(false);
    };

    const handleReset = () => {
        if (onResetToDefault) {
            onResetToDefault(dateStr);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Clock className="size-4" />
                        </div>
                        <DialogTitle>Custom Time for {dateStr}</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs">
                        Set a custom schedule for this specific date instead of the default hours.
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="custom-start-time">Start Time</Label>
                            <Input
                                id="custom-start-time"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="custom-end-time">End Time</Label>
                            <Input
                                id="custom-end-time"
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs font-medium text-destructive">
                            {error}
                        </p>
                    )}
                </DialogBody>

                <DialogFooter className="gap-2 sm:justify-between">
                    {onResetToDefault && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleReset}
                            className="text-muted-foreground"
                        >
                            Reset to Default
                        </Button>
                    )}
                    <Button type="button" onClick={handleSave}>
                        Apply Custom Time
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}