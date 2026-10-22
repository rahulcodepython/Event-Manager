"use client";

import * as React from "react";
import {
    AlertCircle,
    Calendar,
    Check,
    Clock,
    Lock,
    SlidersHorizontal,
    Users,
} from "lucide-react";

import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
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
import type { EventFormDetails } from "../../../schema/eventform.types";

interface EventFormSettingsDialogProps {
    eventForm: EventFormDetails;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaveSettings: (settings: {
        max_applicants: number;
        expires_at: string;
    }) => Promise<void>;
    isSaving?: boolean;
    isLockPrompt?: boolean;
    onProceedToLock?: () => void;
}

export function EventFormSettingsDialog({
    eventForm,
    open,
    onOpenChange,
    onSaveSettings,
    isSaving = false,
    isLockPrompt = false,
    onProceedToLock,
}: EventFormSettingsDialogProps) {
    const isLocked = eventForm.is_locked;

    // Convert ISO string to YYYY-MM-DDTHH:MM for datetime-local
    const formatForDatetimeLocal = (isoString?: string) => {
        if (!isoString) return "";
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return "";
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch {
            return "";
        }
    };

    const [isUnlimited, setIsUnlimited] = React.useState<boolean>(
        eventForm.max_applicants === -1
    );
    // Kept as typed so an invalid entry shows an error instead of being changed.
    const [maxApplicants, setMaxApplicants] = React.useState<string>(
        String(eventForm.max_applicants === -1 ? 100 : eventForm.max_applicants)
    );
    const parsedMax = Number(maxApplicants);
    const capacityError = !isUnlimited && (!Number.isInteger(parsedMax) || parsedMax < 1)
        ? "Capacity must be a whole number of at least 1"
        : "";
    const [expiresAt, setExpiresAt] = React.useState<string>(() =>
        formatForDatetimeLocal(eventForm.expires_at)
    );

    // Sync when dialog opens or eventForm changes
    React.useEffect(() => {
        if (open) {
            setIsUnlimited(eventForm.max_applicants === -1);
            setMaxApplicants(
                String(eventForm.max_applicants === -1 ? 100 : eventForm.max_applicants)
            );
            setExpiresAt(formatForDatetimeLocal(eventForm.expires_at));
        }
    }, [open, eventForm]);

    const hasChanges = React.useMemo(() => {
        const currentMax = isUnlimited ? -1 : parsedMax;
        if (currentMax !== eventForm.max_applicants) return true;
        const currentFormatted = formatForDatetimeLocal(eventForm.expires_at);
        if (expiresAt !== currentFormatted) return true;
        return false;
    }, [isUnlimited, parsedMax, expiresAt, eventForm]);

    const isFutureDate = React.useMemo(() => {
        if (!expiresAt) return false;
        const time = new Date(expiresAt).getTime();
        return !isNaN(time) && time > Date.now();
    }, [expiresAt]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLocked || capacityError) return;

        const targetMax = isUnlimited ? -1 : parsedMax;
        const targetExpires = expiresAt
            ? new Date(expiresAt).toISOString()
            : eventForm.expires_at;

        try {
            await onSaveSettings({
                max_applicants: targetMax,
                expires_at: targetExpires,
            });
        } catch {
            // The mutation shows the error; keep the dialog open.
            return;
        }

        if (isLockPrompt && onProceedToLock) {
            onOpenChange(false);
            onProceedToLock();
        } else {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <DialogHeader>
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <SlidersHorizontal className="size-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-semibold">
                                    Registration Limits & Deadline
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    Set attendee capacity and registration expiration deadline.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <DialogBody className="space-y-4">
                        {isLockPrompt && (
                            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground flex items-start gap-2.5">
                                <AlertCircle className="size-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-semibold text-primary">
                                        Set Limits Before Locking
                                    </p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Please verify the maximum capacity and registration deadline. Once locked, the form becomes immutable and live for public registration.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Capacity Section */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium flex items-center gap-1.5">
                                    <Users className="size-3.5 text-muted-foreground" />
                                    <span>Max Applicants (Capacity)</span>
                                </Label>
                                <span className="text-[11px] text-muted-foreground">
                                    Currently registered:{" "}
                                    <strong className="text-foreground">
                                        {eventForm.total_applicants}
                                    </strong>
                                </span>
                            </div>

                            {isLocked ? (
                                <div className="text-xs font-semibold text-foreground p-2.5 rounded-md bg-muted/40 border flex items-center gap-2">
                                    <Lock className="size-3.5 text-muted-foreground" />
                                    <span>
                                        {eventForm.max_applicants === -1
                                            ? "Unlimited Attendees"
                                            : `${eventForm.max_applicants} Attendees Max`}
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Input
                                        type="number"
                                        min={1}
                                        disabled={isUnlimited || isLocked}
                                        value={isUnlimited ? "" : maxApplicants}
                                        placeholder={isUnlimited ? "Unlimited" : "e.g. 150"}
                                        onChange={(e) => setMaxApplicants(e.target.value)}
                                        aria-invalid={Boolean(capacityError)}
                                        className="h-10 text-sm"
                                    />
                                    {
                                        capacityError && <p className="text-xs font-medium text-destructive">{capacityError}</p>
                                    }
                                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                                        <Checkbox
                                            checked={isUnlimited}
                                            disabled={isLocked}
                                            onCheckedChange={(checked) =>
                                                setIsUnlimited(!!checked)
                                            }
                                        />
                                        <span>Unlimited capacity (no applicant cap)</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Deadline Section */}
                        <div className="space-y-2">
                            <Label className="text-xs font-medium flex items-center gap-1.5">
                                <Calendar className="size-3.5 text-muted-foreground" />
                                <span>Registration Deadline</span>
                            </Label>

                            {isLocked ? (
                                <div className="text-xs font-semibold text-foreground p-2.5 rounded-md bg-muted/40 border flex items-center gap-2">
                                    <Clock className="size-3.5 text-muted-foreground" />
                                    <span>
                                        {new Date(eventForm.expires_at).toLocaleString()}
                                    </span>
                                </div>
                            ) : null}
                            <p className="text-[11px] text-muted-foreground">
                                ID cards are emailed on {new Date(eventForm.cards_publish_at).toLocaleString()}. Change both dates under ID Cards.
                            </p>
                            {isLocked ? (
                                null
                            ) : (
                                <div className="space-y-1">
                                    <Input
                                        type="datetime-local"
                                        disabled={isLocked}
                                        value={expiresAt}
                                        onChange={(e) => setExpiresAt(e.target.value)}
                                        className="h-10 text-sm font-mono"
                                        required
                                    />
                                    {!isFutureDate && expiresAt && (
                                        <p className="text-[11px] text-destructive font-medium">
                                            Deadline must be in the future.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </DialogBody>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>

                        {!isLocked && (
                            <Button
                                type="submit"
                                disabled={
                                    isSaving ||
                                    !isFutureDate ||
                                    Boolean(capacityError) ||
                                    (!isLockPrompt && !hasChanges)
                                }
                            >
                                {isLockPrompt ? (
                                    <>
                                        <Lock className="size-4" />
                                        <span>
                                            {isSaving
                                                ? "Saving..."
                                                : "Save & Proceed to Lock"}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="size-4" />
                                        <span>
                                            {isSaving ? "Saving..." : "Save Limits"}
                                        </span>
                                    </>
                                )}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
