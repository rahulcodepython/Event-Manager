import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import {
    AttendanceMetricsResponse,
    AttendanceMetricsResponseSchema,
    DeviceSubEvents,
    DeviceSubEventsSchema,
    MarkAttendanceResponse,
    MarkAttendanceResponseSchema,
    MarkEntryRequest,
    MarkExitRequest,
    PaginatedAttendeeAnalysis,
    PaginatedAttendeeAnalysisSchema,
    ScanApplicantRequest,
    ScanApplicantResponse,
    ScanApplicantResponseSchema,
} from "../schema/attendance.types";

/** Scans a card; the event comes from the QR, so it is passed per call. */
export function useScanApplicantMutation() {
    return useMutation<ScanApplicantResponse, ApiError, ScanApplicantRequest & { eventId: string }>({
        mutationFn: async ({ eventId, qr, sub_event_id }) => {
            return apiRequest<ScanApplicantResponse>(
                {
                    url: `/events/${eventId}/attendance/scan`,
                    method: "POST",
                    data: { qr, sub_event_id },
                },
                ScanApplicantResponseSchema,
            );
        },
    });
}

export function useMarkEntryMutation(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation<MarkAttendanceResponse, ApiError, MarkEntryRequest>({
        mutationFn: async (payload) => {
            return apiRequest<MarkAttendanceResponse>(
                {
                    url: `/events/${eventId}/attendance/entry`,
                    method: "POST",
                    data: payload,
                },
                MarkAttendanceResponseSchema,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.analysis.all });
            toast.success("Entry marked successfully!");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to mark entry");
        },
    });
}

export function useMarkExitMutation(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation<MarkAttendanceResponse, ApiError, MarkExitRequest>({
        mutationFn: async (payload) => {
            return apiRequest<MarkAttendanceResponse>(
                {
                    url: `/events/${eventId}/attendance/exit`,
                    method: "POST",
                    data: payload,
                },
                MarkAttendanceResponseSchema,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.analysis.all });
            toast.success("Exit marked successfully!");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to mark exit");
        },
    });
}

export function useAttendanceMetricsQuery(
    eventId: string,
    filters?: { fromDate?: string; toDate?: string; subEventId?: string },
    options?: { enabled?: boolean },
) {
    const fromDate = filters?.fromDate || undefined;
    const toDate = filters?.toDate || undefined;
    const subEventId = filters?.subEventId || undefined;

    return useQuery<AttendanceMetricsResponse, ApiError>({
        queryKey: queryKeys.analysis.metrics(eventId, { fromDate, toDate, subEventId }),
        queryFn: async () => {
            return apiRequest<AttendanceMetricsResponse>(
                {
                    url: `/events/${eventId}/analysis/metrics`,
                    method: "GET",
                    params: {
                        from_date: fromDate,
                        to_date: toDate,
                        sub_event_id: subEventId,
                    },
                },
                AttendanceMetricsResponseSchema,
            );
        },
        enabled: options?.enabled !== undefined
            ? options.enabled
            : Boolean(eventId && fromDate && toDate),
    });
}

export function useAttendeeAnalysisQuery(
    eventId: string,
    params?: {
        search?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
        selectedDate?: string;
        subEventId?: string;
        page?: number;
        limit?: number;
    },
    options?: { enabled?: boolean },
) {
    const subEventId = params?.subEventId || undefined;
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 30;
    const search = params?.search?.trim() || undefined;
    const status = params?.status?.trim() || undefined;
    const fromDate = params?.fromDate || undefined;
    const toDate = params?.toDate || undefined;
    const selectedDate = params?.selectedDate || undefined;

    return useQuery<PaginatedAttendeeAnalysis, ApiError>({
        queryKey: queryKeys.analysis.attendees(eventId, {
            search,
            status,
            fromDate,
            toDate,
            selectedDate,
            subEventId,
            page,
            limit,
        }),
        queryFn: async () => {
            return apiRequest<PaginatedAttendeeAnalysis>(
                {
                    url: `/events/${eventId}/analysis/attendees`,
                    method: "GET",
                    params: {
                        page,
                        limit,
                        search,
                        status,
                        from_date: fromDate,
                        to_date: toDate,
                        selected_date: selectedDate,
                        sub_event_id: subEventId,
                    },
                },
                PaginatedAttendeeAnalysisSchema,
            );
        },
        enabled: options?.enabled !== undefined
            ? options.enabled
            : Boolean(eventId && selectedDate),
    });
}

/** Sub-events of every event this scanner device is assigned to. */
export function useDeviceSubEventsQuery(enabled: boolean) {
    return useQuery<DeviceSubEvents, ApiError>({
        queryKey: queryKeys.subEvents.device,
        queryFn: () => apiRequest<DeviceSubEvents>({ url: "/attendance/sub-events", method: "GET" }, DeviceSubEventsSchema),
        enabled,
    });
}
