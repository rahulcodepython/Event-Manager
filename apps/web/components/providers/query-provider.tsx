"use client"

import { useState } from "react"
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "../../react-query/client"
import { ERR_MSG_GENERIC } from "../../lib/constants"

// One QueryClient per app. staleTime is the app-wide default; override
// per-query only when needed. Mutations toast their own errors in
// query-hooks/*, so this only owns query errors.
export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [client] = useState(
        () =>
            new QueryClient({
                queryCache: new QueryCache({
                    // A 401 is not worth an error toast.
                    onError: (error) => {
                        if (error instanceof ApiError && error.status === 401) return
                        toast.error(error.message || ERR_MSG_GENERIC)
                    },
                }),
                defaultOptions: {
                    queries: {
                        staleTime: 60_000,
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            })
    )

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
