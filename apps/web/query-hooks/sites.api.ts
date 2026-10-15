import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import { SiteSchema, SlugCheckSchema, type Site, type SlugCheck } from "../schema/sites.types";

export function useSiteQuery(eventId: string) {
    return useQuery<Site, ApiError>({
        queryKey: queryKeys.sites.detail(eventId),
        queryFn: () => apiRequest({ url: `/events/${eventId}/site/`, method: "GET" }, SiteSchema),
        enabled: Boolean(eventId),
    });
}

export function useSlugCheckQuery(eventId: string, slug: string) {
    return useQuery<SlugCheck, ApiError>({
        queryKey: queryKeys.sites.check(eventId, slug),
        queryFn: () => apiRequest({ url: `/events/${eventId}/site/check`, method: "GET", params: { slug } }, SlugCheckSchema),
        enabled: Boolean(eventId && slug),
        staleTime: 10_000,
    });
}

function useSiteMutation<TVars>(eventId: string, request: (vars: TVars) => Promise<Site | void>, success: string) {
    const queryClient = useQueryClient();
    return useMutation<Site | void, ApiError, TVars>({
        mutationFn: request,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.sites.detail(eventId) });
            queryClient.invalidateQueries({ queryKey: ["sites", "check"] });
            toast.success(success);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });
}

export function useClaimSlugMutation(eventId: string) {
    return useSiteMutation<string>(
        eventId,
        (slug) => apiRequest({ url: `/events/${eventId}/site/`, method: "PUT", data: { slug } }, SiteSchema),
        "Subdomain saved",
    );
}

export function useUploadSiteMutation(eventId: string) {
    return useSiteMutation<File>(
        eventId,
        (file) => {
            const body = new FormData();
            body.append("file", file);
            return apiRequest({ url: `/events/${eventId}/site/upload`, method: "POST", data: body }, SiteSchema);
        },
        "Site uploaded and live",
    );
}

export function useDeleteSiteMutation(eventId: string) {
    return useSiteMutation<void>(
        eventId,
        () => apiRequest({ url: `/events/${eventId}/site/`, method: "DELETE" }),
        "Site deleted",
    );
}
