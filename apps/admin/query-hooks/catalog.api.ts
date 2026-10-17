import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError, apiRequest } from "../react-query/client"
import { queryKeys } from "../react-query/query-keys"
import {
    CatalogSchema,
    type Catalog,
    type UpdateFeatureInput,
    type UpdateSettingsInput,
} from "../schema/catalog.types"

export function useCatalogQuery() {
    return useQuery<Catalog, ApiError>({
        queryKey: queryKeys.catalog,
        queryFn: () => apiRequest<Catalog>({ url: "/catalog", method: "GET" }, CatalogSchema),
    })
}

function useCatalogMutation<TVars>(request: (vars: TVars) => { url: string, data: unknown }) {
    const queryClient = useQueryClient()

    return useMutation<Catalog, ApiError, TVars>({
        mutationFn: (vars) => {
            const { url, data } = request(vars)
            return apiRequest<Catalog>({ url, method: "PUT", data }, CatalogSchema)
        },
        onSuccess: (catalog) => {
            queryClient.setQueryData(queryKeys.catalog, catalog)
            toast.success("Catalog saved")
        },
        onError: (err) => {
            toast.error(err.message)
        },
    })
}

export function useUpdateSettingsMutation() {
    return useCatalogMutation<UpdateSettingsInput>((data) => ({ url: "/catalog/settings", data }))
}

export function useUpdateFeatureMutation() {
    return useCatalogMutation<{ id: string, data: UpdateFeatureInput }>(({ id, data }) => ({ url: `/catalog/features/${id}`, data }))
}
