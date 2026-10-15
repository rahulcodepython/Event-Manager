import { InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import {
    ApplicantFilter,
    ApplicantItem,
    ApplicantItemSchema,
    BulkCreateApplicantsResponse,
    BulkCreateApplicantsResponseSchema,
    CreateApplicantValues,
    DeleteApplicantResponse,
    DeleteApplicantResponseSchema,
    FormSummary,
    FormSummarySchema,
    PaginatedApplicantResponse,
    PaginatedApplicantResponseSchema,
} from "../schema/applicants.types";

export function useApplicantSchemaQuery(eventId: string) {
    return useQuery<FormSummary | null, Error>({
        queryKey: queryKeys.applicants.schema(eventId),
        queryFn: async () => {
            const res = await apiRequest<FormSummary | null>(
                {
                    url: `/events/${eventId}/applicants/schema`,
                    method: "GET",
                },
                FormSummarySchema.nullable(),
            );
            return res ?? null;
        },
        enabled: Boolean(eventId),
        staleTime: 5 * 60 * 1000,
    });
}

export function useApplicantsInfiniteQuery(
    eventId: string,
    filters?: { search?: string; filters?: ApplicantFilter[] },
) {
    const search = filters?.search?.trim() || undefined;
    const dynamicFilters =
        filters?.filters && filters.filters.length > 0
            ? filters.filters
            : undefined;

    return useInfiniteQuery<
        PaginatedApplicantResponse,
        Error,
        InfiniteData<PaginatedApplicantResponse>,
        readonly unknown[],
        number
    >({
        queryKey: queryKeys.applicants.byEvent(eventId, {
            search,
            filters: dynamicFilters,
        }),
        queryFn: async ({ pageParam = 1 }) => {
            return apiRequest<PaginatedApplicantResponse>(
                {
                    url: `/events/${eventId}/applicants`,
                    method: "GET",
                    params: {
                        page: pageParam,
                        limit: 30,
                        search,
                        filters: dynamicFilters
                            ? JSON.stringify(dynamicFilters)
                            : undefined,
                    },
                },
                PaginatedApplicantResponseSchema,
            );
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (!lastPage || lastPage.data.length < lastPage.limit) {
                return undefined;
            }
            if (lastPage.page * lastPage.limit >= lastPage.total) {
                return undefined;
            }
            return lastPage.page + 1;
        },
        enabled: Boolean(eventId),
    });
}

export function useCreateApplicantMutation(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation<ApplicantItem, ApiError, CreateApplicantValues>({
        mutationFn: async (values) => {
            return apiRequest<ApplicantItem>(
                {
                    url: `/events/${eventId}/applicants`,
                    method: "POST",
                    data: values,
                },
                ApplicantItemSchema,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.applicants.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.analysis.all });
            toast.success("Applicant added successfully");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to add applicant");
        },
    });
}

export function useBulkCreateApplicantsMutation(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation<BulkCreateApplicantsResponse, ApiError, CreateApplicantValues[]>({
        mutationFn: async (applicants) => {
            return apiRequest<BulkCreateApplicantsResponse>(
                {
                    url: `/events/${eventId}/applicants/bulk`,
                    method: "POST",
                    data: { applicants },
                },
                BulkCreateApplicantsResponseSchema,
            );
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.applicants.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.analysis.all });
            if (res.failed.length === 0) {
                toast.success(`${res.created} applicants uploaded`);
            } else {
                toast.warning(`${res.created} uploaded, ${res.failed.length} failed`);
            }
        },
        onError: (err) => {
            toast.error(err.message || "Failed to upload applicants");
        },
    });
}

export function useDeleteApplicantMutation(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation<DeleteApplicantResponse, ApiError, string>({
        mutationFn: async (applicantId) => {
            return apiRequest<DeleteApplicantResponse>(
                {
                    url: `/events/${eventId}/applicants/${applicantId}`,
                    method: "DELETE",
                },
                DeleteApplicantResponseSchema,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.applicants.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.analysis.all });
            toast.success("Applicant removed successfully");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to remove applicant");
        },
    });
}
