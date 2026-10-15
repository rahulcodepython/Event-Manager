"use client";

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
    type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import { DeleteResponseZod, type DeleteResponse } from "../schema/common.types";
import {
    CreateEventSchema,
    EventListResponseSchema,
    EventSchema,
    type CreateEventInput,
    type Event,
    type EventListResponse,
    type UpdateEventInput,
} from "../schema/events.types";

interface EventsFilter {
    search?: string;
    organization_id?: string;
}

// React-query hook to fetch a single event by id
export function useEventQuery(id: string) {
    return useQuery<Event, Error>({
        queryKey: queryKeys.events.detail(id),
        queryFn: () => apiRequest<Event>(
            {
                url: `/events/${id}`,
                method: "GET",
            },
            EventSchema,
        ),
        enabled: Boolean(id),
    });
}

// Infinite query for paginated event listings (20 items per page)
export function useEventsInfiniteQuery(filters?: EventsFilter) {
    const search = filters?.search?.trim() || undefined;
    const organization_id = filters?.organization_id?.trim() || undefined;

    return useInfiniteQuery<EventListResponse, Error, InfiniteData<EventListResponse>, readonly unknown[], number>({
        queryKey: queryKeys.events.list({ search }),
        queryFn: async ({ pageParam = 1 }) => {
            return apiRequest<EventListResponse>(
                {
                    url: "/events",
                    method: "GET",
                    params: {
                        page: pageParam,
                        limit: 20,
                        search,
                        organization_id,
                    },
                },
                EventListResponseSchema,
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
    });
}

// Mutation to create a new event
export function useCreateEventMutation() {
    const queryClient = useQueryClient();

    return useMutation<Event, Error, CreateEventInput>({
        mutationFn: async (input: CreateEventInput) => {
            const validated = CreateEventSchema.parse(input);
            return apiRequest<Event>(
                {
                    url: "/events",
                    method: "POST",
                    data: validated,
                },
                EventSchema,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.credits.all });
            toast.success("Event created successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create event");
        },
    });
}

// Mutation to update an event
export function useUpdateEventMutation() {
    const queryClient = useQueryClient();

    return useMutation<Event, Error, { id: string } & UpdateEventInput>({
        mutationFn: async ({ id, ...data }) => {
            return apiRequest<Event>(
                {
                    url: `/events/${id}`,
                    method: "PATCH",
                    data,
                },
                EventSchema,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
            toast.success("Event updated successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update event");
        },
    });
}

// Mutation to delete an event
export function useDeleteEventMutation() {
    const queryClient = useQueryClient();

    return useMutation<DeleteResponse, Error, string>({
        mutationFn: async (id: string) => {
            return apiRequest<DeleteResponse>(
                {
                    url: `/events/${id}`,
                    method: "DELETE",
                },
                DeleteResponseZod,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.credits.all });
            toast.success("Event deleted successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete event");
        },
    });
}
