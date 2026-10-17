import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { ApiError, apiRequest } from "../react-query/client";
import { queryKeys } from "../react-query/query-keys";
import { DeleteResponseZod, SuccessResponseZod, type DeleteResponse, type SuccessResponse } from "../schema/common.types";
import {
    type AssignEventDevicesValues,
    type CreateDeviceValues,
    type Device,
    DeviceSchema,
    type EventDeviceAssignment,
    EventDeviceAssignmentSchema,
    PaginatedDevicesSchema,
    type PaginatedDevices,
    type UpdateDeviceValues,
    type VerifyDeviceResponse,
    VerifyDeviceResponseSchema,
    type VerifyDeviceValues,
    type WebAuthnLoginOptionsPayload,
    type WebAuthnLoginOptionsResponse,
    type WebAuthnLoginVerifyPayload,
    type WebAuthnRegisterOptionsPayload,
    type WebAuthnRegisterOptionsResponse,
    type WebAuthnRegisterVerifyPayload,
} from "../schema/devices.types";

// ---------------------------------------------------------------------
// Global Devices Queries & Mutations
// ---------------------------------------------------------------------

export function useDevicesQuery(params?: { search?: string; page?: number; limit?: number }) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 30;
    const search = params?.search?.trim() || undefined;

    return useQuery<PaginatedDevices, ApiError>({
        queryKey: queryKeys.devices.list({ search, page, limit }),
        queryFn: () => {
            return apiRequest<PaginatedDevices>(
                {
                    url: "/devices",
                    method: "GET",
                    params: { search, page, limit },
                },
                PaginatedDevicesSchema,
            );
        },
    });
}

export function useCreateDeviceMutation() {
    const queryClient = useQueryClient();

    return useMutation<Device, ApiError, CreateDeviceValues>({
        mutationFn: (values) => {
            return apiRequest<Device>(
                {
                    url: "/devices",
                    method: "POST",
                    data: values,
                },
                DeviceSchema,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.devices.all });
            toast.success("Device created with 5-minute pairing PIN");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to create device");
        },
    });
}

export function useUpdateDeviceMutation() {
    const queryClient = useQueryClient();

    return useMutation<Device, ApiError, { id: string; values: UpdateDeviceValues }>({
        mutationFn: ({ id, values }) => {
            return apiRequest<Device>(
                {
                    url: `/devices/${id}`,
                    method: "PATCH",
                    data: values,
                },
                DeviceSchema,
            );
        },
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.devices.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.devices.detail(updated.id) });
            toast.success("Device settings updated successfully");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to update device");
        },
    });
}

export function useRegeneratePINMutation() {
    const queryClient = useQueryClient();

    return useMutation<Device, ApiError, { id: string }>({
        mutationFn: ({ id }) => {
            return apiRequest<Device>(
                {
                    url: `/devices/${id}/regenerate-pin`,
                    method: "POST",
                },
                DeviceSchema,
            );
        },
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.devices.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.devices.detail(updated.id) });
            toast.success("New 5-minute PIN generated successfully");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to regenerate PIN");
        },
    });
}

export function useDeleteDeviceMutation() {
    const queryClient = useQueryClient();

    return useMutation<DeleteResponse, ApiError, { id: string }>({
        mutationFn: ({ id }) => {
            return apiRequest<DeleteResponse>(
                {
                    url: `/devices/${id}`,
                    method: "DELETE",
                },
                DeleteResponseZod,
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.devices.all });
            toast.success("Device deleted successfully");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to delete device");
        },
    });
}

// ---------------------------------------------------------------------
// Event Devices Queries & Mutations
// ---------------------------------------------------------------------

export function useEventDevicesQuery(eventId: string) {
    return useQuery<EventDeviceAssignment[], ApiError>({
        queryKey: queryKeys.devices.byEvent(eventId),
        queryFn: async () => {
            const data = await apiRequest<EventDeviceAssignment[]>(
                {
                    url: `/events/${eventId}/devices`,
                    method: "GET",
                },
                z.array(EventDeviceAssignmentSchema),
            );
            return data ?? [];
        },
        enabled: Boolean(eventId),
    });
}

export function useAvailableGlobalDevicesQuery(eventId: string) {
    return useQuery<Device[], ApiError>({
        queryKey: queryKeys.devices.available(eventId),
        queryFn: async () => {
            const data = await apiRequest<Device[]>(
                {
                    url: `/events/${eventId}/devices/available`,
                    method: "GET",
                },
                z.array(DeviceSchema),
            );
            return data ?? [];
        },
        enabled: Boolean(eventId),
    });
}

export function useAssignEventDevicesMutation() {
    const queryClient = useQueryClient();

    return useMutation<SuccessResponse, ApiError, { eventId: string; values: AssignEventDevicesValues }>({
        mutationFn: ({ eventId, values }) => {
            return apiRequest<SuccessResponse>(
                {
                    url: `/events/${eventId}/devices/assign`,
                    method: "POST",
                    data: values,
                },
                SuccessResponseZod,
            );
        },
        onSuccess: (_, { eventId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.devices.byEvent(eventId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.devices.available(eventId) });
            toast.success("Devices assigned to event successfully");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to assign devices");
        },
    });
}

export function useUnassignEventDeviceMutation() {
    const queryClient = useQueryClient();

    return useMutation<DeleteResponse, ApiError, { eventId: string; deviceId: string }>({
        mutationFn: ({ eventId, deviceId }) => {
            return apiRequest<DeleteResponse>(
                {
                    url: `/events/${eventId}/devices/${deviceId}`,
                    method: "DELETE",
                },
                DeleteResponseZod,
            );
        },
        onSuccess: (_, { eventId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.devices.byEvent(eventId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.devices.available(eventId) });
            toast.success("Device unassigned from event");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to unassign device");
        },
    });
}

// ---------------------------------------------------------------------
// Public Pairing / Verification Mutation & Query
// ---------------------------------------------------------------------

export function useVerifyDeviceMutation() {
    return useMutation<VerifyDeviceResponse, ApiError, VerifyDeviceValues>({
        mutationFn: (values) => {
            return apiRequest<VerifyDeviceResponse>(
                {
                    url: "/devices/verify",
                    method: "POST",
                    data: values,
                },
                VerifyDeviceResponseSchema,
            );
        },
    });
}

export function useMyDeviceQuery(enabled: boolean = true) {
    return useQuery<Device, ApiError>({
        queryKey: queryKeys.devices.me,
        queryFn: () => {
            return apiRequest<Device>(
                {
                    url: "/devices/me",
                    method: "GET",
                },
                DeviceSchema,
            );
        },
        enabled,
        retry: false,
    });
}

// ---------------------------------------------------------------------
// WebAuthn Biometric Mutations
// ---------------------------------------------------------------------

export function useWebAuthnRegisterOptionsMutation() {
    return useMutation<WebAuthnRegisterOptionsResponse, ApiError, WebAuthnRegisterOptionsPayload>({
        mutationFn: (values) => {
            return apiRequest<WebAuthnRegisterOptionsResponse>({
                url: "/devices/webauthn/register-options",
                method: "POST",
                data: values,
            });
        },
    });
}

export function useWebAuthnRegisterVerifyMutation() {
    return useMutation<VerifyDeviceResponse, ApiError, WebAuthnRegisterVerifyPayload>({
        mutationFn: (values) => {
            return apiRequest<VerifyDeviceResponse>(
                {
                    url: "/devices/webauthn/register-verify",
                    method: "POST",
                    data: values,
                },
                VerifyDeviceResponseSchema,
            );
        },
    });
}

export function useWebAuthnLoginOptionsMutation() {
    return useMutation<WebAuthnLoginOptionsResponse, ApiError, WebAuthnLoginOptionsPayload>({
        mutationFn: (values) => {
            return apiRequest<WebAuthnLoginOptionsResponse>({
                url: "/devices/webauthn/login-options",
                method: "POST",
                data: values,
            });
        },
    });
}

export function useWebAuthnLoginVerifyMutation() {
    return useMutation<VerifyDeviceResponse, ApiError, WebAuthnLoginVerifyPayload>({
        mutationFn: (values) => {
            return apiRequest<VerifyDeviceResponse>(
                {
                    url: "/devices/webauthn/login-verify",
                    method: "POST",
                    data: values,
                },
                VerifyDeviceResponseSchema,
            );
        },
    });
}
