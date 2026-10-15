import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"

import { ApiError, apiRequest } from "../react-query/client"
import { queryKeys } from "../react-query/query-keys"
import {
    SubscriptionSchema,
    type RenewInput,
    type Subscription,
    type SubscriptionInput,
} from "../schema/subscriptions.types"

export function useSubscriptionsQuery() {
    return useQuery<Subscription[], ApiError>({
        queryKey: queryKeys.subscriptions,
        queryFn: () => apiRequest<Subscription[]>({ url: "/subscriptions", method: "GET" }, z.array(SubscriptionSchema)),
    })
}

function useSubscriptionMutation<TVars>(
    request: (vars: TVars) => { url: string, method: string, data?: unknown },
    success: string,
) {
    const queryClient = useQueryClient()

    return useMutation<unknown, ApiError, TVars>({
        mutationFn: (vars) => apiRequest(request(vars)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions })
            queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.categories })
            queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            toast.success(success)
        },
        onError: (err) => {
            toast.error(err.message)
        },
    })
}

export function useCreateSubscriptionMutation() {
    return useSubscriptionMutation<SubscriptionInput>((data) => ({ url: "/subscriptions", method: "POST", data }), "Subscription added")
}

export function useUpdateSubscriptionMutation() {
    return useSubscriptionMutation<{ id: string, data: SubscriptionInput }>(
        ({ id, data }) => ({ url: `/subscriptions/${id}`, method: "PATCH", data }),
        "Subscription saved",
    )
}

export function useDeleteSubscriptionMutation() {
    return useSubscriptionMutation<string>((id) => ({ url: `/subscriptions/${id}`, method: "DELETE" }), "Subscription deleted")
}

export function useRenewSubscriptionMutation() {
    return useSubscriptionMutation<{ id: string, data: RenewInput }>(
        ({ id, data }) => ({ url: `/subscriptions/${id}/renew`, method: "POST", data }),
        "Renewal recorded",
    )
}
