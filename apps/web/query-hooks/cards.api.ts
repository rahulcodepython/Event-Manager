import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, apiClient, apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import { CardStatusSchema, QRSchema, type CardSchedule, type CardStatus } from "../schema/cards.types";

export function useCardStatusQuery(eventId: string) {
    return useQuery<CardStatus, ApiError>({
        queryKey: queryKeys.cards.status(eventId),
        queryFn: () => apiRequest<CardStatus>({ url: `/events/${eventId}/cards/`, method: "GET" }, CardStatusSchema),
        enabled: Boolean(eventId),
        // Delivery progresses in the background while cards are queued.
        refetchInterval: (query) => (query.state.data?.counts.queued ? 5000 : false),
    });
}

/** Every card action returns the new status; the form and applicants change too. */
function useCardAction<TVars>(
    eventId: string,
    request: (vars: TVars) => { url: string, method: string, data?: unknown },
    success: string,
) {
    const queryClient = useQueryClient();

    return useMutation<CardStatus, ApiError, TVars>({
        mutationFn: (vars) => apiRequest<CardStatus>(request(vars), CardStatusSchema),
        onSuccess: (status) => {
            queryClient.setQueryData(queryKeys.cards.status(eventId), status);
            queryClient.invalidateQueries({ queryKey: queryKeys.eventForm.detail(eventId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.applicants.all });
            toast.success(success);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });
}

export function useScheduleCardsMutation(eventId: string) {
    return useCardAction<CardSchedule>(eventId, (data) => ({ url: `/events/${eventId}/cards/schedule`, method: "PUT", data }), "Schedule saved");
}

export function useCloseApplicationsMutation(eventId: string) {
    return useCardAction<void>(eventId, () => ({ url: `/events/${eventId}/cards/close`, method: "POST" }), "Applications closed");
}

export function usePublishCardsMutation(eventId: string) {
    return useCardAction<void>(eventId, () => ({ url: `/events/${eventId}/cards/publish`, method: "POST" }), "Cards are being sent");
}

export function useResendCardsMutation(eventId: string) {
    return useCardAction<"failed" | "all">(
        eventId,
        (scope) => ({ url: `/events/${eventId}/cards/resend`, method: "POST", data: { scope } }),
        "Cards queued",
    );
}

export function useResendCardMutation(eventId: string) {
    return useCardAction<string>(
        eventId,
        (applicantId) => ({ url: `/events/${eventId}/applicants/${applicantId}/card/resend`, method: "POST" }),
        "Card queued",
    );
}

/** The signed QR text of one applicant (what the card's QR encodes). */
export function useApplicantQRQuery(eventId: string, applicantId: string, enabled: boolean) {
    return useQuery<string, ApiError>({
        queryKey: queryKeys.cards.qr(eventId, applicantId),
        queryFn: async () => (await apiRequest({ url: `/events/${eventId}/applicants/${applicantId}/qr`, method: "GET" }, QRSchema)).qr,
        enabled: enabled && Boolean(eventId && applicantId),
        staleTime: Infinity,
    });
}

/** Downloads one applicant's card PDF (rendered on request, never stored). */
export async function downloadCard(eventId: string, applicantId: string) {
    try {
        const res = await apiClient.get<Blob>(`/events/${eventId}/applicants/${applicantId}/card`, { responseType: "blob" });
        const url = URL.createObjectURL(res.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = `id-card-${applicantId}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to download card");
    }
}
