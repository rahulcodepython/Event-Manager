import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { ApiError, apiRequest } from "../react-query/client"
import { queryKeys } from "../react-query/query-keys"
import { CatalogSchema, QuoteSchema, type Catalog, type Quote, type Selection } from "../schema/pricing.types"

export function useCatalogQuery() {
    return useQuery<Catalog, ApiError>({
        queryKey: queryKeys.pricing.catalog,
        queryFn: () => apiRequest<Catalog>({ url: "/pricing/catalog", method: "GET" }, CatalogSchema),
        staleTime: 5 * 60 * 1000,
    })
}

/** Server-side price for a set of selections; refetches as they change. */
export function useQuoteQuery(selections: Selection[], enabled = true) {
    return useQuery<Quote, ApiError>({
        queryKey: queryKeys.pricing.quote(selections),
        queryFn: () =>
            apiRequest<Quote>({ url: "/pricing/quote", method: "POST", data: { selections } }, QuoteSchema),
        enabled,
        placeholderData: keepPreviousData,
    })
}
