import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"

import { ApiError, apiRequest } from "../react-query/client"
import { queryKeys } from "../react-query/query-keys"
import {
    CategorySchema,
    TransactionListSchema,
    type Category,
    type CategoryInput,
    type Transaction,
    type TransactionFilter,
    type TransactionInput,
    type TransactionList,
} from "../schema/ledger.types"

export function useCategoriesQuery() {
    return useQuery<Category[], ApiError>({
        queryKey: queryKeys.categories,
        queryFn: () => apiRequest<Category[]>({ url: "/categories", method: "GET" }, z.array(CategorySchema)),
    })
}

function useLedgerMutation<TVars, TResult>(
    request: (vars: TVars) => { url: string, method: string, data?: unknown },
    success: string,
) {
    const queryClient = useQueryClient()

    return useMutation<TResult, ApiError, TVars>({
        mutationFn: (vars) => apiRequest<TResult>(request(vars)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.categories })
            queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
            queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions })
            queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            toast.success(success)
        },
        onError: (err) => {
            toast.error(err.message)
        },
    })
}

export function useCreateCategoryMutation() {
    return useLedgerMutation<CategoryInput, Category>((data) => ({ url: "/categories", method: "POST", data }), "Category created")
}

export function useRenameCategoryMutation() {
    return useLedgerMutation<{ id: string, data: CategoryInput }, Category>(
        ({ id, data }) => ({ url: `/categories/${id}`, method: "PATCH", data }),
        "Category renamed",
    )
}

export function useDeleteCategoryMutation() {
    return useLedgerMutation<string, void>((id) => ({ url: `/categories/${id}`, method: "DELETE" }), "Category deleted")
}

export function useTransactionsQuery(filter: TransactionFilter) {
    return useQuery<TransactionList, ApiError>({
        queryKey: queryKeys.transactions.list(filter),
        queryFn: () => apiRequest<TransactionList>(
            { url: "/transactions", method: "GET", params: { ...filter, limit: 25 } },
            TransactionListSchema,
        ),
        placeholderData: keepPreviousData,
    })
}

export function useCreateTransactionMutation() {
    return useLedgerMutation<TransactionInput, Transaction>(
        (data) => ({ url: "/transactions", method: "POST", data }),
        "Entry added",
    )
}

export function useUpdateTransactionMutation() {
    return useLedgerMutation<{ id: string, data: TransactionInput }, Transaction>(
        ({ id, data }) => ({ url: `/transactions/${id}`, method: "PATCH", data }),
        "Entry saved",
    )
}

export function useDeleteTransactionMutation() {
    return useLedgerMutation<string, void>((id) => ({ url: `/transactions/${id}`, method: "DELETE" }), "Entry deleted")
}
