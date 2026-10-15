import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { ApiError, apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import {
    ApplicationFeeSchema,
    OrganizerDraftSchema,
    PayoutAccountSchema,
    PayoutStatusSchema,
    type ApplicationFee,
    type OnboardPayoutValues,
    type OrganizerDraft,
    type PayoutAccount,
    type PayoutStatus,
} from "../schema/payouts.types";

/** The organization's payout account (refreshed from Razorpay while pending). */
export function usePayoutQuery() {
    return useQuery<PayoutStatus, ApiError>({
        queryKey: queryKeys.payouts.status,
        queryFn: () => apiRequest({ url: "/payouts", method: "GET" }, PayoutStatusSchema),
    });
}

export function useOnboardPayoutMutation() {
    const queryClient = useQueryClient();
    return useMutation<PayoutAccount, ApiError, OnboardPayoutValues>({
        mutationFn: (data) => apiRequest({ url: "/payouts", method: "POST", data }, PayoutAccountSchema),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.payouts.status });
            toast.success("Payout account created");
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });
}

export function useApplicationFeeQuery(eventId: string) {
    return useQuery<ApplicationFee, ApiError>({
        queryKey: queryKeys.payouts.fee(eventId),
        queryFn: () => apiRequest({ url: `/events/${eventId}/application-fee`, method: "GET" }, ApplicationFeeSchema),
        enabled: Boolean(eventId),
    });
}

/** Sets the form's fee in paise (0 = free). */
export function useSetApplicationFeeMutation(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation<ApplicationFee, ApiError, number>({
        mutationFn: (fee) => apiRequest({ url: `/events/${eventId}/application-fee`, method: "PUT", data: { fee } }, ApplicationFeeSchema),
        onSuccess: (data) => {
            queryClient.setQueryData(queryKeys.payouts.fee(eventId), data);
            toast.success("Application fee saved");
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });
}

/** Applications in progress, awaiting payment or refunded. */
export function useEventDraftsQuery(eventId: string, enabled = true) {
    return useQuery<OrganizerDraft[], ApiError>({
        queryKey: queryKeys.payouts.drafts(eventId),
        queryFn: () => apiRequest({ url: `/events/${eventId}/drafts`, method: "GET" }, z.array(OrganizerDraftSchema)),
        enabled: Boolean(eventId) && enabled,
    });
}

/** Refunds a paid applicant in full and removes them from the event. */
export function useRefundApplicantMutation(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation<unknown, ApiError, { applicantId: string, reason: string }>({
        mutationFn: ({ applicantId, reason }) => apiRequest({
            url: `/events/${eventId}/applicants/${applicantId}/refund`,
            method: "POST",
            data: { reason },
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.applicants.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.analysis.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.payouts.drafts(eventId) });
            toast.success("Applicant refunded and removed");
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });
}
