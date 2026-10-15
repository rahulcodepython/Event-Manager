// =====================================================================
// API Routing & Environment Defaults
// =====================================================================
export const API_V1_PREFIX = "/api/v1";
export const DEFAULT_API_BASE_URL = "http://localhost:8000";
export const DEFAULT_APP_BASE_URL = "http://localhost:3000";

// =====================================================================
// Common Error Messages
// =====================================================================
export const ERR_MSG_GENERIC = "An unexpected error occurred. Please try again.";
export const ERR_MSG_REQUEST_FAILED = "Request failed";

// =====================================================================
// LocalStorage & Session Keys
// =====================================================================
export const STORAGE_KEYS = {
    DEVICE_TOKEN: "device_token",
} as const;

// =====================================================================
// Internal Application Routes (Next.js Pages)
// =====================================================================
export const APP_ROUTES = {
    HOME: "/",
    DASHBOARD: "/dashboard",
    EVENTS: "/dashboard/events",
    EVENT_OVERVIEW: (eventId: string) => `/dashboard/events/${eventId}`,
    EVENT_DATES: (eventId: string) => `/dashboard/events/${eventId}/dates`,
    EVENT_FORM: (eventId: string) => `/dashboard/events/${eventId}/form`,
    EVENT_APPLICANTS: (eventId: string) => `/dashboard/events/${eventId}/applicants`,
    EVENT_DEVICES: (eventId: string) => `/dashboard/events/${eventId}/devices`,
    EVENT_ANALYSIS: (eventId: string) => `/dashboard/events/${eventId}/analysis`,
    EVENT_SETTINGS: (eventId: string) => `/dashboard/events/${eventId}/settings`,
    FORMS: "/dashboard/forms",
    FORM_DESIGNER: (formId: string) => `/dashboard/forms/${formId}/design`,
    DEVICES: "/dashboard/devices",
    PAYOUTS: "/dashboard/payouts",
    DEVICE_PAIR: "/devices/pair",
    DEVICE_SCAN: "/devices/scan",
    PUBLIC_APPLY: (formId: string) => `/apply/${formId}`,
} as const;

// =====================================================================
// Backend API Endpoints (relative to base API prefix)
// =====================================================================
export const API_ENDPOINTS = {
    EVENTS: "/events",
    EVENT_BY_ID: (id: string) => `/events/${id}`,
    EVENT_DATES: (eventId: string) => `/events/${eventId}/dates`,
    EVENT_DATES_OVERRIDE: (eventId: string) => `/events/${eventId}/dates/override`,
    EVENT_DATES_SYNC: (eventId: string) => `/events/${eventId}/dates/sync`,
    FORMS: "/forms",
    FORM_BY_ID: (id: string) => `/forms/${id}`,
    FORM_FIELDS: (id: string) => `/forms/${id}/fields`,
    EVENT_FORM: (eventId: string) => `/events/${eventId}/form`,
    EVENT_FORM_LOCK: (eventId: string) => `/events/${eventId}/form/lock`,
    PUBLIC_APPLY: (eventFormId: string) => `/public/apply/${eventFormId}`,
    APPLICANTS: (eventId: string) => `/events/${eventId}/applicants`,
    APPLICANTS_SCHEMA: (eventId: string) => `/events/${eventId}/applicants/schema`,
    APPLICANT_BY_ID: (eventId: string, applicantId: string) => `/events/${eventId}/applicants/${applicantId}`,
    DEVICES: "/devices",
    DEVICE_BY_ID: (id: string) => `/devices/${id}`,
    DEVICES_ME: "/devices/me",
    DEVICES_VERIFY: "/devices/verify",
    DEVICE_REGEN_PIN: (id: string) => `/devices/${id}/regenerate-pin`,
    WEBAUTHN_REG_OPTIONS: "/devices/webauthn/register-options",
    WEBAUTHN_REG_VERIFY: "/devices/webauthn/register-verify",
    WEBAUTHN_LOGIN_OPTIONS: "/devices/webauthn/login-options",
    WEBAUTHN_LOGIN_VERIFY: "/devices/webauthn/login-verify",
    EVENT_DEVICES: (eventId: string) => `/events/${eventId}/devices`,
    EVENT_DEVICES_AVAILABLE: (eventId: string) => `/events/${eventId}/devices/available`,
    EVENT_DEVICES_ASSIGN: (eventId: string) => `/events/${eventId}/devices/assign`,
    EVENT_DEVICE_UNASSIGN: (eventId: string, deviceId: string) => `/events/${eventId}/devices/${deviceId}`,
    ATTENDANCE_SCAN: (eventId: string) => `/events/${eventId}/attendance/scan`,
    ATTENDANCE_ENTRY: (eventId: string) => `/events/${eventId}/attendance/entry`,
    ATTENDANCE_EXIT: (eventId: string) => `/events/${eventId}/attendance/exit`,
    ANALYSIS_METRICS: (eventId: string) => `/events/${eventId}/analysis/metrics`,
    ANALYSIS_ATTENDEES: (eventId: string) => `/events/${eventId}/analysis/attendees`,
} as const;

// =====================================================================
// Query Key Roots
// =====================================================================
export const QUERY_KEY_ROOTS = {
    EVENTS: "events",
    EVENT_DATES: "event-dates",
    FORMS: "forms",
    EVENT_FORM: "event-form",
    PUBLIC_APPLY: "public-apply",
    APPLICANTS: "applicants",
    DEVICES: "devices",
    ATTENDANCE: "attendance",
    ANALYSIS: "analysis",
} as const;

// =====================================================================
// Form Field Types
// =====================================================================
export const FIELD_TYPES = {
    TEXT: "text",
    TEXTAREA: "textarea",
    NUMBER: "number",
    EMAIL: "email",
    PHONE: "phone",
    SELECT: "select",
    RADIO: "radio",
    CHECKBOX: "checkbox",
    DATE: "date",
    TIME: "time",
    FILE: "file",
    SWITCH: "switch",
} as const;

// =====================================================================
// Toast Messages
// =====================================================================
export const TOAST_MESSAGES = {
    GENERIC_ERROR: "An unexpected error occurred. Please try again.",
    EVENT_CREATED: "Event created successfully",
    EVENT_UPDATED: "Event updated successfully",
    EVENT_DELETED: "Event deleted successfully",
    DATES_SAVED: "Event dates saved successfully",
    DATES_DELETED: "Event dates deleted successfully",
    DATES_OVERRIDDEN: "All event dates overridden successfully",
    FORM_CREATED: "Form template created successfully",
    FORM_UPDATED: "Form template updated successfully",
    FORM_LOCKED: "Event form locked successfully",
    APPLICANT_CREATED: "Applicant registered successfully",
    APPLICANT_DELETED: "Applicant deleted successfully",
    APPLICATION_SUBMITTED: "Application submitted successfully!",
    DEVICE_CREATED: "Scanner device created successfully",
    DEVICE_VERIFIED: "Device paired successfully",
    DEVICE_DELETED: "Device deleted successfully",
    PIN_REGENERATED: "PIN regenerated successfully",
    DEVICES_ASSIGNED: "Devices assigned successfully",
    DEVICE_UNASSIGNED: "Device removed from event",
    ENTRY_MARKED: "Attendee checked in successfully",
    EXIT_MARKED: "Attendee checked out successfully",
} as const;

// =====================================================================
// Hardware & Fallback Constants
// =====================================================================
export const FALLBACK_CONSTANTS = {
    DEVICE_NAME: "Scanner Terminal",
    FINGERPRINT: "fp_browser_device",
    PUBLIC_APPLY_TITLE: "Event Registration",
} as const;
