import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError, apiRequest } from "../react-query/client"
import { queryKeys } from "../react-query/query-keys"
import { AdminMeSchema, type AdminMe, type LoginValues } from "../schema/auth.types"

export function useMeQuery() {
    return useQuery<AdminMe, ApiError>({
        queryKey: queryKeys.auth.me,
        queryFn: () => apiRequest<AdminMe>({ url: "/auth/me", method: "GET" }, AdminMeSchema),
        retry: false,
        staleTime: 5 * 60 * 1000,
    })
}

/** Logs in, then reloads into the dashboard so no stale query survives. */
export function useLoginMutation() {
    return useMutation<AdminMe, ApiError, LoginValues>({
        mutationFn: (values) =>
            apiRequest<AdminMe>({ url: "/auth/login", method: "POST", data: values }, AdminMeSchema),
        onSuccess: () => {
            window.location.href = "/dashboard"
        },
        onError: (err) => {
            toast.error(err.message || "Login failed")
        },
    })
}

/** Ends the session, then reloads on /login so every cached query is dropped. */
export function useLogoutMutation() {
    return useMutation<void, ApiError>({
        mutationFn: () => apiRequest<void>({ url: "/auth/logout", method: "POST" }),
        onSettled: () => {
            window.location.href = "/login"
        },
    })
}
