export const queryKeys = {
    auth: {
        me: ["auth", "me"] as const,
    },
    pricing: {
        catalog: ["pricing", "catalog"] as const,
        quote: (selections: unknown) => ["pricing", "quote", selections] as const,
    },
    credits: {
        all: ["credits"] as const,
    },
    events: {
        all: ["events"] as const,
        list: (filters?: { search?: string }) => ["events", "list", filters] as const,
        detail: (id: string) => ["events", "detail", id] as const,
    },
    eventDates: {
        all: ["eventDates"] as const,
        byEvent: (eventId: string) => ["eventDates", "event", eventId] as const,
        byMonth: (eventId: string, month: string) =>
            ["eventDates", "event", eventId, "month", month] as const,
    },
    forms: {
        all: ["forms"] as const,
        list: (filters?: { search?: string; published?: boolean }) =>
            ["forms", "list", filters] as const,
        detail: (id: string) => ["forms", "detail", id] as const,
    },
    eventForm: {
        all: ["eventForm"] as const,
        detail: (eventId: string) => ["eventForm", "detail", eventId] as const,
    },
    publicApply: {
        all: ["publicApply"] as const,
        detail: (eventFormId: string) => ["publicApply", "detail", eventFormId] as const,
    },
    applicants: {
        all: ["applicants"] as const,
        schema: (eventId: string) => ["applicants", "schema", eventId] as const,
        byEvent: (eventId: string, filters?: { search?: string; filters?: unknown }) =>
            ["applicants", "event", eventId, filters] as const,
    },
    subEvents: {
        overview: (eventId: string) => ["subEvents", "overview", eventId] as const,
        enrolled: (subEventId: string, params: { search: string; page: number }) => ["subEvents", "enrolled", subEventId, params] as const,
        dates: (subEventId: string) => ["subEvents", "dates", subEventId] as const,
        device: ["subEvents", "device"] as const,
    },
    cards: {
        status: (eventId: string) => ["cards", "status", eventId] as const,
        qr: (eventId: string, applicantId: string) => ["cards", "qr", eventId, applicantId] as const,
    },
    devices: {
        all: ["devices"] as const,
        list: (filters?: { search?: string; page?: number; limit?: number }) =>
            ["devices", "list", filters] as const,
        detail: (id: string) => ["devices", "detail", id] as const,
        byEvent: (eventId: string) => ["devices", "event", eventId] as const,
        available: (eventId: string) => ["devices", "available", eventId] as const,
        me: ["devices", "me"] as const,
    },
    analysis: {
        all: ["analysis"] as const,
        metrics: (eventId: string, filters?: { fromDate?: string; toDate?: string; subEventId?: string }) =>
            ["analysis", "metrics", eventId, filters] as const,
        attendees: (
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
        ) => ["analysis", "attendees", eventId, params] as const,
    },
} as const;


