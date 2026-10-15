"use client";

import * as React from "react";
import { CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import type { SubmitApplicationResponse } from "../../schema/publicapply.types";

interface ApplySuccessCardProps {
    submission: SubmitApplicationResponse;
    eventName?: string;
    email: string;
}

export function ApplySuccessCard({
    submission,
    eventName,
    email,
}: ApplySuccessCardProps) {
    const [copiedUserId, setCopiedUserId] = React.useState(false);

    const handleCopyUserId = async () => {
        if (!submission.user_id) return;
        try {
            await navigator.clipboard.writeText(submission.user_id);
            setCopiedUserId(true);
            toast.success("User ID copied to clipboard");
            setTimeout(() => setCopiedUserId(false), 2000);
        } catch {
            toast.error("Failed to copy User ID");
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/20">
            <Card className="max-w-lg w-full text-center p-6 sm:p-8 space-y-6">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                    <CheckCircle2 className="size-8" />
                </div>

                <div className="space-y-1.5">
                    <Badge
                        variant="outline"
                        className="border-blue-500/30 bg-blue-500/10 text-blue-600 font-medium text-xs"
                    >
                        Application Submitted
                    </Badge>
                    <h2 className="text-xl font-bold text-foreground">
                        {submission.status === "enrolled" ? "You're in!" : "Application Received!"}
                    </h2>
                    {
                        submission.status === "enrolled" && <p className="text-xs text-muted-foreground">
                            {submission.message}
                        </p>
                    }
                    <p className={submission.status === "enrolled" ? "hidden" : "text-xs text-muted-foreground"}>
                        Thank you for submitting your application for{" "}
                        <span className="font-semibold text-foreground">{eventName || "the event"}</span>.
                        Your submission has been received and queued. You will be able to sign in to check your booking confirmation status once applicant login is enabled.
                    </p>
                </div>

                {/* Assigned Application Reference ID display */}
                <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-left">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                        Application Reference ID
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-card border rounded-lg p-2.5">
                        <span className="font-mono text-sm font-bold text-primary tracking-wide">
                            {submission.user_id}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCopyUserId}
                            className="gap-2"
                        >
                            {copiedUserId ? (
                                <CheckCircle2 className="size-3.5 text-blue-500" />
                            ) : (
                                <Copy className="size-3.5" />
                            )}
                            <span>{copiedUserId ? "Copied" : "Copy ID"}</span>
                        </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        Please save this Application Reference ID for your records and future status tracking.
                    </p>
                </div>

                <div className="text-xs text-muted-foreground border-t pt-4">
                    A submission record has been registered for{" "}
                    <span className="font-medium text-foreground">{email}</span>.
                </div>
            </Card>
        </div>
    );
}
