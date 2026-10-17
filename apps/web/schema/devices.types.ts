import type {
    AuthenticationResponseJSON,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import { z } from "zod";

import { PaginatedResponseZod, type PaginatedResponse } from "./common.types";

export const DeviceSchema = z.object({
    id: z.string(),
    name: z.string(),
    actual_name: z.string().nullish(),
    fingerprint: z.string().nullish(),
    pin: z.string().nullish(),
    pin_expires_at: z.string().nullish(),
    expires_at: z.string().nullish(),
    last_active_at: z.string().nullish(),
    webauthn_credential_id: z.string().nullish(),
    webauthn_public_key: z.string().nullish(),
    webauthn_aaguid: z.string().nullish(),
    webauthn_sign_count: z.number().default(0),
    is_biometric_enrolled: z.boolean().default(false),
    is_paired: z.boolean(),
    is_expired: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
});

export type Device = z.infer<typeof DeviceSchema>;

export const PaginatedDevicesSchema = PaginatedResponseZod(DeviceSchema);
export type PaginatedDevices = PaginatedResponse<Device>;

export const CreateDeviceSchema = z.object({
    name: z.string().min(1, "Device name is required").max(100, "Device name is too long"),
    expires_at: z.string().nullish(),
});

export type CreateDeviceValues = z.infer<typeof CreateDeviceSchema>;

export const UpdateDeviceSchema = z.object({
    name: z.string().min(1, "Device name is required").max(100, "Device name is too long").optional(),
    expires_at: z.string().nullish(),
});

export type UpdateDeviceValues = z.infer<typeof UpdateDeviceSchema>;

export const VerifyDeviceSchema = z.object({
    pin: z.string().length(6, "PIN must be exactly 6 digits"),
    fingerprint: z.string(),
    actual_name: z.string(),
});

export type VerifyDeviceValues = z.infer<typeof VerifyDeviceSchema>;

export const VerifyDeviceResponseSchema = z.object({
    device_id: z.string(),
    name: z.string(),
    actual_name: z.string(),
    token: z.string(),
    is_biometric_enrolled: z.boolean().default(false),
    expires_at: z.string().nullish(),
});

export type VerifyDeviceResponse = z.infer<typeof VerifyDeviceResponseSchema>;

export const EventDeviceAssignmentSchema = z.object({
    id: z.string(),
    event_id: z.string(),
    device_id: z.string(),
    device: DeviceSchema,
    created_at: z.string(),
});

export type EventDeviceAssignment = z.infer<typeof EventDeviceAssignmentSchema>;

export const AssignEventDevicesSchema = z.object({
    device_ids: z.array(z.string()).min(1, "Select at least one device"),
});

export type AssignEventDevicesValues = z.infer<typeof AssignEventDevicesSchema>;

export interface WebAuthnRegisterOptionsPayload {
    pin: string;
    actual_name: string;
}

export interface WebAuthnRegisterOptionsResponse {
    session_id: string;
    options: PublicKeyCredentialCreationOptionsJSON;
}

export interface WebAuthnRegisterVerifyPayload {
    session_id: string;
    actual_name: string;
    fingerprint: string;
    response: RegistrationResponseJSON;
}

export interface WebAuthnLoginOptionsPayload {
    device_id?: string;
    credential_id?: string;
}

export interface WebAuthnLoginOptionsResponse {
    session_id: string;
    options: PublicKeyCredentialRequestOptionsJSON;
}

export interface WebAuthnLoginVerifyPayload {
    session_id: string;
    response: AuthenticationResponseJSON;
}
