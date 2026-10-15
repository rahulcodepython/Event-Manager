import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { ApiError, apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import {
    AssignResponseSchema,
    EnrolledListSchema,
    SubEventDaySchema,
    SubEventSchema,
    SubEventsOverviewSchema,
    type AssignResponse,
    type EnrolledList,
    type SubEvent,
    type SubEventDay,
    type SubEventInput,
    type SubEventMode,
    type SubEventsOverview,
} from "../schema/subevents.types";

export function useSubEventsQuery(eventId: string) {
    return useQuery<SubEventsOverview, ApiError>({
        queryKey: queryKeys.subEvents.overview(eventId),
        queryFn: () => apiRequest({ url: `/events/${eventId}/sub-events`, method: "GET" }, SubEventsOverviewSchema),
        enabled: Boolean(eventId),
    });
}

/** Refreshes everything that shows sub-events or enrollments. */
function useInvalidate(eventId: string) {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.subEvents.overview(eventId) });
        queryClient.invalidateQueries({ queryKey: ["subEvents", "enrolled"] });
        queryClient.invalidateQueries({ queryKey: queryKeys.applicants.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.analysis.all });
    };
}

function useSubEventMutation<TVars, TResult>(
    eventId: string,
    request: (vars: TVars) => Promise<TResult>,
    success: string | ((result: TResult) => string),
) {
    const invalidate = useInvalidate(eventId);
    return useMutation<TResult, ApiError, TVars>({
        mutationFn: request,
        onSuccess: (result) => {
            invalidate();
            toast.success(typeof success === "function" ? success(result) : success);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });
}

export function useCreateSubEventMutation(eventId: string) {
    return useSubEventMutation<SubEventInput, SubEvent>(
        eventId,
        (data) => apiRequest({ url: `/events/${eventId}/sub-events`, method: "POST", data }, SubEventSchema),
        "Sub-event created",
    );
}

export function useUpdateSubEventMutation(eventId: string) {
    return useSubEventMutation<{ id: string, data: SubEventInput }, SubEvent>(
        eventId,
        ({ id, data }) => apiRequest({ url: `/events/${eventId}/sub-events/${id}/`, method: "PATCH", data }, SubEventSchema),
        "Sub-event saved",
    );
}

export function useDeleteSubEventMutation(eventId: string) {
    return useSubEventMutation<string, void>(
        eventId,
        (id) => apiRequest({ url: `/events/${eventId}/sub-events/${id}/`, method: "DELETE" }),
        "Sub-event deleted",
    );
}

export function useSubEventSettingsMutation(eventId: string) {
    return useSubEventMutation<{ mode: SubEventMode, required: boolean }, SubEventsOverview>(
        eventId,
        (data) => apiRequest({ url: `/events/${eventId}/sub-event-settings`, method: "PUT", data }, SubEventsOverviewSchema),
        "Form settings saved",
    );
}

/** Replaces a sub-event's days (each with its hours). */
export function useSaveSubEventDaysMutation(eventId: string, subEventId: string) {
    return useSubEventMutation<SubEventDay[], SubEventDay[]>(
        eventId,
        (dates) => apiRequest(
            { url: `/events/${eventId}/sub-events/${subEventId}/dates/override`, method: "POST", data: { dates } },
            z.array(SubEventDaySchema.passthrough()),
        ),
        "Days saved",
    );
}

export function useEnrolledQuery(eventId: string, subEventId: string, params: { search: string, page: number }) {
    return useQuery<EnrolledList, ApiError>({
        queryKey: queryKeys.subEvents.enrolled(subEventId, params),
        queryFn: () => apiRequest(
            { url: `/events/${eventId}/sub-events/${subEventId}/applicants`, method: "GET", params: { ...params, limit: 25 } },
            EnrolledListSchema,
        ),
        enabled: Boolean(eventId && subEventId),
        placeholderData: keepPreviousData,
    });
}

export function useAssignMutation(eventId: string, subEventId: string) {
    return useSubEventMutation<string[], AssignResponse>(
        eventId,
        (ids) => apiRequest(
            { url: `/events/${eventId}/sub-events/${subEventId}/applicants`, method: "POST", data: { applicant_ids: ids } },
            AssignResponseSchema,
        ),
        (res) => res.failed.length ? `${res.added} added, ${res.failed.length} not added` : `${res.added} added`,
    );
}

export function useUnassignMutation(eventId: string, subEventId: string) {
    return useSubEventMutation<string, void>(
        eventId,
        (applicantId) => apiRequest({ url: `/events/${eventId}/sub-events/${subEventId}/applicants/${applicantId}`, method: "DELETE" }),
        "Removed from sub-event",
    );
}
