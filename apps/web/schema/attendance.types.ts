import { z } from "zod";

/** The scanned QR text: a server-signed card token. */
export const ScanApplicantRequestSchema = z.object({
    qr: z.string(),
    /** Scan for a sub-event: its days, enrolled applicants only. */
    sub_event_id: z.string().optional(),
});

export type ScanApplicantRequest = z.infer<typeof ScanApplicantRequestSchema>;

/**
 * Reads the event id from a signed card QR ("IC1.<payload>.<signature>").
 * The payload is readable; only the server checks the signature.
 */
export function eventIdFromQR(qr: string): string | null {
    const parts = qr.trim().split(".");
    if (parts.length !== 3 || parts[0] !== "IC1") return null;
    try {
        const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(json) as { e?: unknown };
        return typeof payload.e === "string" ? payload.e : null;
    } catch {
        return null;
    }
}

export const ScanApplicantInfoSchema = z.object({
    user_id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().optional().default(""),
    data: z.record(z.string(), z.any()).nullish().default({}),
    registered_at: z.string(),
});

export type ScanApplicantInfo = z.infer<typeof ScanApplicantInfoSchema>;

export const ScanEventInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    venue: z.string(),
});

export type ScanEventInfo = z.infer<typeof ScanEventInfoSchema>;

export const ScanEventDateInfoSchema = z.object({
    id: z.string(),
    date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
});

export type ScanEventDateInfo = z.infer<typeof ScanEventDateInfoSchema>;

export const ScanDeviceInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    actual_name: z.string(),
});

export type ScanDeviceInfo = z.infer<typeof ScanDeviceInfoSchema>;

export const ScanAttendanceInfoSchema = z.object({
    id: z.string().nullable(),
    status: z.enum(["ready_for_entry", "ready_for_exit", "already_exited", "session_ended"]),
    entered_at: z.string().nullable(),
    exited_at: z.string().nullable(),
    is_early: z.boolean().nullable(),
});

export type ScanAttendanceInfo = z.infer<typeof ScanAttendanceInfoSchema>;

export const ScanApplicantResponseSchema = z.object({
    applicant: ScanApplicantInfoSchema,
    event: ScanEventInfoSchema,
    sub_event: z.object({ id: z.string(), name: z.string(), venue: z.string() }).nullish(),
    event_date: ScanEventDateInfoSchema,
    device: ScanDeviceInfoSchema,
    attendance: ScanAttendanceInfoSchema,
});

export type ScanApplicantResponse = z.infer<typeof ScanApplicantResponseSchema>;

export const MarkEntryRequestSchema = z.object({
    applicant_id: z.string(),
    event_date_id: z.string(),
});

export type MarkEntryRequest = z.infer<typeof MarkEntryRequestSchema>;

export const MarkExitRequestSchema = z.object({
    applicant_id: z.string(),
    event_date_id: z.string(),
});

export type MarkExitRequest = z.infer<typeof MarkExitRequestSchema>;

export const MarkAttendanceResponseSchema = z.object({
    id: z.string(),
    event_id: z.string(),
    event_date_id: z.string(),
    applicant_id: z.string(),
    status: z.string(),
    entered_at: z.string(),
    exited_at: z.string().nullable(),
    is_early: z.boolean(),
    message: z.string(),
});

export type MarkAttendanceResponse = z.infer<typeof MarkAttendanceResponseSchema>;

// Analysis Schemas
export const AttendanceOverviewSchema = z.object({
    total_applicants: z.number(),
    total_attended: z.number(),
    total_not_attended: z.number(),
    attendance_percentage: z.number(),
});

export type AttendanceOverview = z.infer<typeof AttendanceOverviewSchema>;

export const AttendanceByDateSchema = z.object({
    date: z.string(),
    attendees_count: z.number(),
});

export type AttendanceByDate = z.infer<typeof AttendanceByDateSchema>;

export const AttendancePunctualitySchema = z.object({
    early_count: z.number(),
    late_count: z.number(),
});

export type AttendancePunctuality = z.infer<typeof AttendancePunctualitySchema>;

export const AttendanceMetricsResponseSchema = z.object({
    overview: AttendanceOverviewSchema,
    by_date: z.array(AttendanceByDateSchema),
    punctuality: AttendancePunctualitySchema,
});

export type AttendanceMetricsResponse = z.infer<typeof AttendanceMetricsResponseSchema>;

export const AttendeeAnalysisItemSchema = z.object({
    applicant_id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullish().optional(),
    status: z.enum(["attended", "inside", "not_attended"]),
    event_date_id: z.string().nullable(),
    date: z.string().nullable(),
    start_time: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),
    entered_at: z.string().nullable(),
    exited_at: z.string().nullable(),
    is_early: z.boolean().nullable(),
    device_name: z.string().nullable(),
});

export type AttendeeAnalysisItem = z.infer<typeof AttendeeAnalysisItemSchema>;

export const PaginatedAttendeeAnalysisSchema = z.object({
    data: z.array(AttendeeAnalysisItemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
});

export type PaginatedAttendeeAnalysis = z.infer<typeof PaginatedAttendeeAnalysisSchema>;

export const DeviceSubEventsSchema = z.array(z.object({
    event_id: z.string(),
    event_name: z.string(),
    sub_events: z.array(z.object({
        id: z.string(),
        name: z.string(),
        venue: z.string(),
        dates: z.array(z.string()),
    })),
}));

export type DeviceSubEvents = z.infer<typeof DeviceSubEventsSchema>;
