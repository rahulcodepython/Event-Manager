import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError, apiRequest } from "../react-query/client"
import { queryKeys } from "../react-query/query-keys"
import {
    ClientDetailSchema,
    ClientListSchema,
    type ClientDetail,
    type ClientList,
    type GrantCreditInput,
} from "../schema/clients.types"

export function useClientsQuery(params: { search: string, status: string, page: number }) {
    return useQuery<ClientList, ApiError>({
        queryKey: queryKeys.clients.list(params),
        queryFn: () => apiRequest<ClientList>({ url: "/clients", method: "GET", params: { ...params, limit: 20 } }, ClientListSchema),
        placeholderData: keepPreviousData,
    })
}

export function useClientQuery(id: string) {
    return useQuery<ClientDetail, ApiError>({
        queryKey: queryKeys.clients.detail(id),
        queryFn: () => apiRequest<ClientDetail>({ url: `/clients/${id}`, method: "GET" }, ClientDetailSchema),
        enabled: Boolean(id),
    })
}

/** Every client action returns the refreshed client detail. */
function useClientAction<TVars>(
    request: (vars: TVars) => { url: string, data?: unknown },
    success: string,
) {
    const queryClient = useQueryClient()

    return useMutation<ClientDetail, ApiError, TVars>({
        mutationFn: (vars) => {
            const { url, data } = request(vars)
            return apiRequest<ClientDetail>({ url, method: "POST", data }, ClientDetailSchema)
        },
        onSuccess: (client) => {
            queryClient.setQueryData(queryKeys.clients.detail(client.id), client)
            queryClient.invalidateQueries({ queryKey: queryKeys.clients.all })
            queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
            toast.success(success)
        },
        onError: (err) => {
            toast.error(err.message)
        },
    })
}

export function useSuspendClientMutation(id: string) {
    return useClientAction<boolean>(
        (suspend) => ({ url: `/clients/${id}/${suspend ? "suspend" : "unsuspend"}` }),
        "Client updated",
    )
}

export function useResetTrialMutation(id: string) {
    return useClientAction<void>(() => ({ url: `/clients/${id}/reset-trial` }), "Trial reset")
}

export function useGrantCreditMutation(id: string) {
    return useClientAction<GrantCreditInput>((data) => ({ url: `/clients/${id}/credits`, data }), "Credit granted")
}

export function useRefundPaymentMutation() {
    return useClientAction<{ paymentId: string, note: string }>(
        ({ paymentId, note }) => ({ url: `/payments/${paymentId}/refund`, data: { note } }),
        "Refund recorded",
    )
}
