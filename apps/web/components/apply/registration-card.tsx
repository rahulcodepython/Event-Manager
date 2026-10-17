"use client";

import * as React from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useEnrollMutation } from "../../query-hooks/applyflow.api";
import type { ApplyState } from "../../schema/applyflow.types";
import type { PublicSubEventOption } from "../../schema/publicapply.types";

/** Shown instead of the form once the applicant is registered (or refunded). */
export function RegistrationCard({ formId, state, eventName, linkSubEvent }: {
    formId: string;
    state: ApplyState;
    eventName?: string;
    /** Opened through a sub-event link the applicant has not joined yet. */
    linkSubEvent?: PublicSubEventOption;
}) {
    const enroll = useEnrollMutation(formId);
    const reg = state.registration;
    if (!reg) return null;

    if (reg.status === "refunded") {
        return (
            <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                    <XCircle className="size-10 text-destructive" />
                    <p className="font-semibold">Your registration was refunded</p>
                    <p className="text-sm text-muted-foreground">You are no longer registered for {eventName || "this event"}.</p>
                    {
                        reg.refund_reason && <p className="text-sm">Reason: {reg.refund_reason}</p>
                    }
                    <p className="text-xs text-muted-foreground">The fee goes back to your original payment method, usually within 5–7 working days.</p>
                </CardContent>
            </Card>
        );
    }

    const joined = linkSubEvent ? (reg.sub_events ?? []).includes(linkSubEvent.name) : true;

    return (
        <Card className="shadow-sm">
            <CardHeader className="items-center text-center">
                <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
                <CardTitle className="text-lg">You&apos;re registered</CardTitle>
                <CardDescription>
                    {eventName ? `For ${eventName}. ` : ""}Your ID card will be emailed to {state.applicant?.email}.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between rounded-md border p-3">
                    <span className="text-muted-foreground">Applicant ID</span>
                    <span className="font-mono">{reg.user_id}</span>
                </div>
                {
                    (reg.sub_events ?? []).length > 0 && <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-muted-foreground">Sub-events:</span>
                        {
                            (reg.sub_events ?? []).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)
                        }
                    </div>
                }
                {
                    linkSubEvent && !joined && <Button
                        onClick={() => enroll.mutate(linkSubEvent.id)}
                        disabled={enroll.isPending || linkSubEvent.is_full}
                        className="gap-2"
                    >
                        {
                            enroll.isPending && <Loader2 className="size-4 animate-spin" />
                        }
                        {linkSubEvent.is_full ? `${linkSubEvent.name} is full` : `Join ${linkSubEvent.name}`}
                    </Button>
                }
            </CardContent>
        </Card>
    );
}
