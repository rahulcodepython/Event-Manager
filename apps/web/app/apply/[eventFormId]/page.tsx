"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { ApplyEventHeader } from "../../../components/apply/apply-event-header";
import { ApplyStatusCard } from "../../../components/apply/apply-status-card";
import { GoogleSignInCard } from "../../../components/apply/google-signin-card";
import { PoweredByFooter } from "../../../components/apply/powered-by-footer";
import { PublicApplyForm } from "../../../components/apply/public-apply-form";
import { RegistrationCard } from "../../../components/apply/registration-card";
import { useApplyStateQuery } from "../../../query-hooks/applyflow.api";
import { usePublicApplyConfigQuery } from "../../../query-hooks/publicapply.api";

function Loading() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4 bg-muted/20">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Loading registration form...</span>
            </div>
        </div>
    );
}

/**
 * Public application: sign in with Google, then a saved, resumable step
 * form; registered applicants see their registration instead.
 */
export default function PublicApplyPage() {
    const params = useParams();
    const search = useSearchParams();
    const eventFormId = params?.eventFormId as string;
    const subEventLinkId = search.get("sub");
    const signInError = search.get("signin_error");

    const { data: config, isLoading, isError, error } = usePublicApplyConfigQuery(eventFormId);
    const { data: state, isLoading: stateLoading } = useApplyStateQuery(eventFormId);

    if (isLoading || stateLoading) {
        return <Loading />;
    }

    const linkSubEvent = subEventLinkId
        ? config?.sub_events.options.find((o) => o.id === subEventLinkId && o.link_enabled)
        : undefined;
    const registered = Boolean(state?.registration);

    // Closed, full or not yet live (registered applicants still see their registration).
    if (!registered && (isError || !config || config.status === "waiting" || config.is_full || config.is_expired)) {
        return (
            <ApplyStatusCard
                config={config}
                isError={isError}
                errorMessage={error?.message}
                eventFormId={eventFormId}
            />
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-muted/20">
            <div className="w-full max-w-xl space-y-6">
                <ApplyEventHeader
                    event={config?.event ?? undefined}
                    form={config?.form ?? undefined}
                    branding={config?.branding}
                />

                {
                    subEventLinkId && !registered && <div className="rounded-xl border bg-card p-4 text-sm shadow-xs">
                        {
                            linkSubEvent ? <>
                                <p className="font-semibold">Registering for {linkSubEvent.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {linkSubEvent.is_full ? "This sub-event is full." : "Already registered for the event? Sign in with the same Google account to join this sub-event."}
                                </p>
                            </> : <p className="text-xs text-muted-foreground">This sub-event link is not open. You can still register for the event.</p>
                        }
                    </div>
                }

                {
                    !state?.signed_in ? <GoogleSignInCard formId={eventFormId} error={signInError} /> : state.registration ? <RegistrationCard
                        formId={eventFormId}
                        state={state}
                        eventName={config?.event?.name}
                        linkSubEvent={linkSubEvent}
                    /> : config && <PublicApplyForm
                        key={state.draft?.id ?? "new"}
                        eventFormId={eventFormId}
                        config={config}
                        state={state}
                        eventName={config.event?.name}
                        fixedSubEvent={linkSubEvent}
                    />
                }

                {
                    !config?.branding && <PoweredByFooter />
                }
            </div>
        </div>
    );
}
