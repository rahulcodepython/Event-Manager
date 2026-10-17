"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import {
    BulkUpsertEventDatesSchema,
    EventDatesListResponseSchema,
    type BulkUpsertEventDatesInput,
    type EventDate,
    type EventDateItemInput,
} from "../schema/event-dates.types";

// Fetch all event dates for a given month in a single request
export async function getEventDates(
    eventId: string,
    month?: string
): Promise<EventDate[]> {
    try {
        const data = await apiRequest<EventDate[]>(
            {
                url: `/events/${eventId}/dates`,
                method: "GET",
                params: month ? { month } : undefined,
            },
            EventDatesListResponseSchema
        );
        return data ?? [];
    } catch {
        return [];
    }
}

// React-query hook for event dates within a month
export function useEventDatesQuery(eventId: string, month: string) {
    return useQuery<EventDate[], Error>({
        queryKey: queryKeys.eventDates.byMonth(eventId, month),
        queryFn: async () => {
            const data = await getEventDates(eventId, month);
            return data ?? [];
        },
        enabled: Boolean(eventId),
    });
}

// React-query hook for all event dates
export function useAllEventDatesQuery(eventId: string) {
    return useQuery<EventDate[], Error>({
        queryKey: queryKeys.eventDates.byEvent(eventId),
        queryFn: async () => {
            const data = await getEventDates(eventId);
            return data ?? [];
        },
        enabled: Boolean(eventId),
    });
}

// Override all event dates mutation (used for file uploads)
export function useOverrideEventDatesMutation(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation<EventDate[], Error, BulkUpsertEventDatesInput>({
        mutationFn: async (payload: BulkUpsertEventDatesInput) => {
            const validated = BulkUpsertEventDatesSchema.parse(payload);
            return apiRequest<EventDate[]>(
                {
                    url: `/events/${eventId}/dates/override`,
                    method: "POST",
                    data: validated,
                },
                EventDatesListResponseSchema
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.eventDates.byEvent(eventId),
            });
            toast.success("All event dates overridden successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to override event dates");
        },
    });
}

export interface BulkUpdateEventDatesInput {
    upsertDates?: EventDateItemInput[];
    deleteDates?: string[];
}

// Unified bulk update (atomic delete + upsert in a single network round-trip without race conditions)
export function useBulkUpdateEventDatesMutation(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation<EventDate[], Error, BulkUpdateEventDatesInput>({
        mutationFn: async (payload: BulkUpdateEventDatesInput) => {
            return apiRequest<EventDate[]>(
                {
                    url: `/events/${eventId}/dates/sync`,
                    method: "POST",
                    data: {
                        upsert_dates: payload.upsertDates ?? [],
                        delete_dates: payload.deleteDates ?? [],
                    },
                },
                EventDatesListResponseSchema
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.eventDates.byEvent(eventId),
            });
            toast.success("Event dates saved successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update event dates");
        },
    });
}


