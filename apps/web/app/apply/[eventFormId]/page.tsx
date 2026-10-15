"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { ApplyEventHeader } from "../../../components/apply/apply-event-header";
import { ApplyStatusCard } from "../../../components/apply/apply-status-card";
import { ApplySuccessCard } from "../../../components/apply/apply-success-card";
import { PoweredByFooter } from "../../../components/apply/powered-by-footer";
import { PublicApplyForm } from "../../../components/apply/public-apply-form";
import { usePublicApplyConfigQuery } from "../../../query-hooks/publicapply.api";
import type { SubmitApplicationResponse } from "../../../schema/publicapply.types";

export default function PublicApplyPage() {
    const params = useParams();
    const eventFormId = params?.eventFormId as string;

    const {
        data: config,
        isLoading,
        isError,
        error,
    } = usePublicApplyConfigQuery(eventFormId);

    const [submissionSuccess, setSubmissionSuccess] =
        React.useState<SubmitApplicationResponse | null>(null);
    const [submittedEmail, setSubmittedEmail] = React.useState<string>("");

    const handleSuccess = React.useCallback(
        (res: SubmitApplicationResponse, email: string) => {
            setSubmissionSuccess(res);
            setSubmittedEmail(email);
        },
        []
    );

    // 1. Loading State
    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">
                        Loading registration form...
                    </span>
                </div>
            </div>
        );
    }

    // 2. Status Guard Screens (Error, Waiting, Capacity Full, Expired)
    if (
        isError ||
        !config ||
        config.status === "waiting" ||
        config.is_full ||
        config.is_expired
    ) {
        return (
            <ApplyStatusCard
                config={config}
                isError={isError}
                errorMessage={error?.message}
                eventFormId={eventFormId}
            />
        );
    }

    // 3. Submission Successful Screen
    if (submissionSuccess) {
        return (
            <>
                <ApplySuccessCard
                    submission={submissionSuccess}
                    eventName={config.event?.name}
                    email={submittedEmail}
                />
                {
                    !config.branding && <div className="pb-6">
                        <PoweredByFooter />
                    </div>
                }
            </>
        );
    }

    // 4. Active Registration Form
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-muted/20">
            <div className="w-full max-w-xl space-y-6">
                <ApplyEventHeader
                    event={config.event ?? undefined}
                    form={config.form ?? undefined}
                    branding={config.branding}
                />

                <PublicApplyForm
                    eventFormId={eventFormId}
                    config={config}
                    onSuccess={handleSuccess}
                />

                {
                    !config.branding && <PoweredByFooter />
                }
            </div>
        </div>
    );
}
