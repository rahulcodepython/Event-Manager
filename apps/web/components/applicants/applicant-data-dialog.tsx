"use client";

import * as React from "react";

import { Button } from "../ui/button";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import type { ApplicantItem, FormFieldSummary, FormFieldValue } from "../../schema/applicants.types";
import { ApplicantImage } from "./applicant-image";
import { formatFieldValue } from "./applicants-utils";

interface ApplicantDataDialogProps {
    /** Needed to show photo and signature images. */
    eventId?: string;
    applicant: ApplicantItem;
    formFields?: FormFieldSummary[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ApplicantDataDialog({
    applicant,
    formFields,
    eventId,
    open,
    onOpenChange,
}: ApplicantDataDialogProps) {
    const entries = Object.entries(applicant.data || {}).filter(
        ([key]) => key !== "phone" && key !== "mobile" && key !== "name" && key !== "email"
    );
    const phone =
        applicant.phone ||
        (typeof applicant.data?.phone === "string" ? applicant.data.phone : "") ||
        "";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">
                        Applicant Submission Details
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Registered data for{" "}
                        <span className="font-semibold text-foreground">
                            {applicant.name}
                        </span>{" "}
                        ({applicant.user_id}).
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    <div className="rounded-lg border p-3 bg-muted/20 space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Full Name:</span>
                            <span className="font-semibold text-foreground">
                                {applicant.name}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-mono text-foreground">
                                {applicant.email}
                            </span>
                        </div>
                        {phone && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Mobile:</span>
                                <span className="font-mono text-foreground">
                                    {phone}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Applied At:</span>
                            <span className="text-foreground">
                                {new Date(applicant.created_at).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-xs font-semibold text-foreground block">
                            Form Fields
                        </span>
                        {entries.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">
                                No additional custom field responses submitted.
                            </p>
                        ) : (
                            <div className="divide-y rounded-lg border bg-card">
                                {entries.map(([key, val]) => {
                                    const fieldDef = formFields?.find(
                                        (f) => f.key === key
                                    );
                                    const displayLabel =
                                        fieldDef?.label ||
                                        key.replace(/_/g, " ");
                                    const displayVal = fieldDef
                                        ? formatFieldValue(
                                              fieldDef,
                                              val as FormFieldValue
                                          )
                                        : typeof val === "boolean"
                                          ? val
                                              ? "Yes"
                                              : "No"
                                          : Array.isArray(val)
                                            ? val.join(", ")
                                            : String(val ?? "-");

                                    return (
                                        <div
                                            key={key}
                                            className="flex items-start justify-between gap-4 p-2.5 text-xs"
                                        >
                                            <span className="font-mono text-[11px] text-muted-foreground capitalize">
                                                {displayLabel}:
                                            </span>
                                            {
                                                eventId && (fieldDef?.type === "photo" || fieldDef?.type === "signature") ? <ApplicantImage
                                                    eventId={eventId}
                                                    applicantId={applicant.user_id}
                                                    fieldKey={key}
                                                    type={fieldDef.type}
                                                    className={fieldDef.type === "photo" ? "size-24 rounded-md object-cover" : "h-14 max-w-48 rounded border bg-white object-contain"}
                                                /> : <span className="font-medium text-foreground text-right break-all">
                                                    {displayVal}
                                                </span>
                                            }
                                        </div>
                                    );
                                })}
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
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
