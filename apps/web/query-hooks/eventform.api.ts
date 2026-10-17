import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import {
    CreateEventFormSchema,
    type CreateEventFormValues,
    type EventFormDetails,
    EventFormDetailsSchema,
    UpdateEventFormSchema,
    type UpdateEventFormValues,
} from "../schema/eventform.types";

export function useEventFormQuery(eventId: string) {
    return useQuery<EventFormDetails | null, ApiError>({
        queryKey: queryKeys.eventForm.detail(eventId),
        queryFn: async () => {
            try {
                return await apiRequest<EventFormDetails>(
                    {
                        url: `/events/${eventId}/form`,
                        method: "GET",
                    },
                    EventFormDetailsSchema,
                );
            } catch (err) {
                if (err instanceof ApiError && err.status === 404) {
                    return null;
                }
                throw err;
            }
        },
        enabled: Boolean(eventId),
        retry: (failureCount, error) => {
            if (error instanceof ApiError && error.status === 404) {
                return false;
            }
            return failureCount < 3;
        },
    });
}

export function useCreateEventFormMutation() {
    const queryClient = useQueryClient();

    return useMutation<
        EventFormDetails,
        ApiError,
        { eventId: string } & CreateEventFormValues
    >({
        mutationFn: async ({ eventId, ...data }) => {
            const validated = CreateEventFormSchema.parse(data);
            return apiRequest<EventFormDetails>(
                {
                    url: `/events/${eventId}/form`,
                    method: "POST",
                    data: validated,
                },
                EventFormDetailsSchema,
            );
        },
        onSuccess: (res, variables) => {
            queryClient.setQueryData(
                queryKeys.eventForm.detail(variables.eventId),
                res,
            );
            toast.success("Event form created successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create event form");
        },
    });
}

export function useUpdateEventFormMutation() {
    const queryClient = useQueryClient();

    return useMutation<
        EventFormDetails,
        ApiError,
        { eventId: string } & UpdateEventFormValues
    >({
        mutationFn: async ({ eventId, ...data }) => {
            const validated = UpdateEventFormSchema.parse(data);
            return apiRequest<EventFormDetails>(
                {
                    url: `/events/${eventId}/form`,
                    method: "PATCH",
                    data: validated,
                },
                EventFormDetailsSchema,
            );
        },
        onSuccess: (res, variables) => {
            queryClient.setQueryData(
                queryKeys.eventForm.detail(variables.eventId),
                res,
            );
            toast.success("Form saved successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update form");
        },
    });
}

export function useLockEventFormMutation() {
    const queryClient = useQueryClient();

    return useMutation<EventFormDetails, ApiError, { eventId: string }>({
        mutationFn: async ({ eventId }) => {
            return apiRequest<EventFormDetails>(
                {
                    url: `/events/${eventId}/form/lock`,
                    method: "POST",
                },
                EventFormDetailsSchema,
            );
        },
        onSuccess: (res, variables) => {
            queryClient.setQueryData(
                queryKeys.eventForm.detail(variables.eventId),
                res,
            );
            toast.success("Form locked successfully! QR sharing is now active.");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to lock form");
        },
    });
}

export function useDeleteEventFormMutation() {
    const queryClient = useQueryClient();

    return useMutation<{ deleted: boolean }, ApiError, { eventId: string }>({
        mutationFn: async ({ eventId }) => {
            return apiRequest<{ deleted: boolean }>({
                url: `/events/${eventId}/form`,
                method: "DELETE",
            });
        },
        onSuccess: (_res, variables) => {
            queryClient.setQueryData(
                queryKeys.eventForm.detail(variables.eventId),
                null,
            );
            toast.success("Event form deleted successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete form");
        },
    });
}
