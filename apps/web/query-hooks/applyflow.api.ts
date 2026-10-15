import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import type { RazorpayPaymentResult } from "../schema/credits.types";
import { ApplyCheckoutSchema, ApplyStateSchema, IntentSchema, type ApplyCheckout, type ApplyState, type DraftInput, type Intent } from "../schema/applyflow.types";

const base = (formId: string) => `/public/apply/${formId}`;

/** The signed-in applicant, their draft and any registration (survives reloads). */
export function useApplyStateQuery(formId: string) {
    return useQuery<ApplyState, ApiError>({
        queryKey: queryKeys.applyFlow.state(formId),
        queryFn: () => apiRequest({ url: `${base(formId)}/state`, method: "GET" }, ApplyStateSchema),
        enabled: Boolean(formId),
        retry: false,
        staleTime: Infinity,
    });
}

/** Starts a sign-in: a nonce for Google, tied to a cookie on the API. */
export function startIntent(formId: string): Promise<Intent> {
    return apiRequest({ url: `${base(formId)}/intent`, method: "POST" }, IntentSchema);
}

function useStateMutation<TVars>(formId: string, request: (vars: TVars) => { url: string, method: string, data?: unknown }, opts: { quiet?: boolean } = {}) {
    const queryClient = useQueryClient();
    return useMutation<ApplyState, ApiError, TVars>({
        mutationFn: (vars) => apiRequest(request(vars), ApplyStateSchema),
        onSuccess: (state) => {
            queryClient.setQueryData(queryKeys.applyFlow.state(formId), state);
        },
        onError: (err) => {
            if (!opts.quiet) toast.error(err.message);
        },
    });
}

export function useSignInMutation(formId: string) {
    return useStateMutation<string>(formId, (credential) => ({ url: `${base(formId)}/session`, method: "POST", data: { credential } }));
}

/** Auto-save; failures are shown by the caller, not toasted on every keystroke. */
export function useSaveDraftMutation(formId: string) {
    return useStateMutation<DraftInput>(formId, (data) => ({ url: `${base(formId)}/draft`, method: "PUT", data }), { quiet: true });
}

export function useSubmitDraftMutation(formId: string) {
    return useStateMutation<void>(formId, () => ({ url: `${base(formId)}/submit`, method: "POST" }));
}

export function useEnrollMutation(formId: string) {
    return useStateMutation<string>(formId, (subEventId) => ({ url: `${base(formId)}/enroll`, method: "POST", data: { sub_event_id: subEventId } }));
}

/** Holds a seat and returns the Razorpay order for the fee. */
export function usePayMutation(formId: string) {
    const queryClient = useQueryClient();
    return useMutation<ApplyCheckout, ApiError, void>({
        mutationFn: () => apiRequest({ url: `${base(formId)}/pay`, method: "POST" }, ApplyCheckoutSchema),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.applyFlow.state(formId) });
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });
}

/** Leaves the payment step to edit answers; the seat is released. */
export function usePayBackMutation(formId: string) {
    return useStateMutation<void>(formId, () => ({ url: `${base(formId)}/pay/back`, method: "POST" }));
}

export function useVerifyPaymentMutation(formId: string) {
    return useStateMutation<RazorpayPaymentResult>(formId, (data) => ({ url: `${base(formId)}/pay/verify`, method: "POST", data }));
}

export function useSignOutMutation(formId: string) {
    const queryClient = useQueryClient();
    return useMutation<void, ApiError, void>({
        mutationFn: () => apiRequest({ url: `${base(formId)}/session`, method: "DELETE" }),
        onSettled: () => {
            queryClient.setQueryData(queryKeys.applyFlow.state(formId), { signed_in: false, applicant: null, draft: null, registration: null, fee: 0, currency: "INR" });
        },
    });
}
