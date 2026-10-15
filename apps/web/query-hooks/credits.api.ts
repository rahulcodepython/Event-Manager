import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError, apiRequest } from "../react-query/client"
import { queryKeys } from "../react-query/query-keys"
import {
    CreateOrderResponseSchema,
    CreditIdSchema,
    CreditSchema,
    type CreateOrderResponse,
    type Credit,
    type RazorpayPaymentResult,
} from "../schema/credits.types"
import type { Selection } from "../schema/pricing.types"

type CreditId = { credit_id: string }

export function useCreditsQuery() {
    return useQuery<Credit[], ApiError>({
        queryKey: queryKeys.credits.all,
        queryFn: () => apiRequest<Credit[]>({ url: "/credits", method: "GET" }, CreditSchema.array()),
    })
}

export function useClaimTrialMutation() {
    const queryClient = useQueryClient()
    return useMutation<CreditId, ApiError>({
        mutationFn: () => apiRequest<CreditId>({ url: "/credits/trial", method: "POST" }, CreditIdSchema),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.credits.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
            toast.success("Your free trial has started")
        },
        onError: (err) => toast.error(err.message || "Failed to start trial"),
    })
}

export function useSkipTrialMutation() {
    const queryClient = useQueryClient()
    return useMutation<void, ApiError>({
        mutationFn: () => apiRequest<void>({ url: "/credits/trial/skip", method: "POST" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
        },
        onError: (err) => toast.error(err.message || "Something went wrong"),
    })
}

export function useRenameCreditMutation() {
    const queryClient = useQueryClient()
    return useMutation<Credit, ApiError, { id: string; name: string }>({
        mutationFn: ({ id, name }) =>
            apiRequest<Credit>({ url: `/credits/${id}`, method: "PATCH", data: { name } }, CreditSchema),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.credits.all })
            toast.success("Credit renamed")
        },
        onError: (err) => toast.error(err.message || "Failed to rename credit"),
    })
}

export function useCreateOrderMutation() {
    return useMutation<CreateOrderResponse, ApiError, { name: string; selections: Selection[] }>({
        mutationFn: (data) =>
            apiRequest<CreateOrderResponse>({ url: "/credits/orders", method: "POST", data }, CreateOrderResponseSchema),
        onError: (err) => toast.error(err.message || "Failed to start payment"),
    })
}

export function useVerifyPaymentMutation() {
    const queryClient = useQueryClient()
    return useMutation<CreditId, ApiError, RazorpayPaymentResult>({
        mutationFn: (data) =>
            apiRequest<CreditId>({ url: "/credits/orders/verify", method: "POST", data }, CreditIdSchema),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.credits.all })
            toast.success("Payment received. Your credit is ready.")
        },
        onError: (err) => toast.error(err.message || "Payment could not be confirmed"),
    })
}
