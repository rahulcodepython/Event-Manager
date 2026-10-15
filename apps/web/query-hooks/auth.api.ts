import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError, apiRequest, apiBaseUrl } from "../react-query/client"
import { queryKeys } from "../react-query/query-keys"
import {
    MeSchema,
    OrganizationSchema,
    type Me,
    type OnboardingValues,
    type Organization,
} from "../schema/auth.types"

/** Full-page navigation to the API, which redirects to Google. */
export const googleLoginUrl = `${apiBaseUrl}/auth/google`

export function useMeQuery() {
    return useQuery<Me, ApiError>({
        queryKey: queryKeys.auth.me,
        queryFn: () => apiRequest<Me>({ url: "/auth/me", method: "GET" }, MeSchema),
        retry: false,
        staleTime: 5 * 60 * 1000,
    })
}

export function useOnboardingMutation() {
    const queryClient = useQueryClient()

    return useMutation<Organization, ApiError, OnboardingValues>({
        mutationFn: (values) =>
            apiRequest<Organization>(
                { url: "/auth/onboarding", method: "POST", data: values },
                OrganizationSchema,
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
        },
        onError: (err) => {
            toast.error(err.message || "Failed to create organization")
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
