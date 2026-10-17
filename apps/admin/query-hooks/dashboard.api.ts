import { useQuery } from "@tanstack/react-query"

import { ApiError, apiRequest } from "../react-query/client"
import { queryKeys } from "../react-query/query-keys"
import { DashboardSchema, type Dashboard } from "../schema/dashboard.types"

export function useDashboardQuery(months = 12) {
    return useQuery<Dashboard, ApiError>({
        queryKey: queryKeys.dashboard(months),
        queryFn: () => apiRequest<Dashboard>({ url: "/dashboard", method: "GET", params: { months } }, DashboardSchema),
    })
}
