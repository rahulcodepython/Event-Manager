import { z } from "zod";

export const SubEventDaySchema = z.object({
    date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
});

export type SubEventDay = z.infer<typeof SubEventDaySchema>;

export const SubEventSchema = z.object({
    id: z.string(),
    event_id: z.string(),
    name: z.string(),
    description: z.string(),
    venue: z.string(),
    capacity: z.number().nullable(),
    link_enabled: z.boolean(),
    enrolled: z.number(),
    days: z.array(SubEventDaySchema),
    created_at: z.string(),
});

export type SubEvent = z.infer<typeof SubEventSchema>;

export const SubEventModeSchema = z.enum(["off", "one", "many"]);
export type SubEventMode = z.infer<typeof SubEventModeSchema>;

export const SubEventsOverviewSchema = z.object({
    settings: z.object({
        has_form: z.boolean(),
        mode: SubEventModeSchema,
        required: z.boolean(),
    }),
    /** Sub-events the event's credit allows. */
    limit: z.number(),
    sub_events: z.array(SubEventSchema),
});

export type SubEventsOverview = z.infer<typeof SubEventsOverviewSchema>;

export const SubEventFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().trim(),
    venue: z.string().trim(),
    /** Empty means no cap. */
    capacity: z.string().refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 1), "Whole number, at least 1, or empty"),
    link_enabled: z.boolean(),
});

export type SubEventFormValues = z.infer<typeof SubEventFormSchema>;

export type SubEventInput = {
    name: string;
    description: string;
    venue: string;
    capacity: number | null;
    link_enabled: boolean;
};

export const EnrolledApplicantSchema = z.object({
    user_id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    enrolled_at: z.string(),
});

export type EnrolledApplicant = z.infer<typeof EnrolledApplicantSchema>;

export const EnrolledListSchema = z.object({
    data: z.array(EnrolledApplicantSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
});

export type EnrolledList = z.infer<typeof EnrolledListSchema>;

export const AssignResponseSchema = z.object({
    added: z.number(),
    failed: z.array(z.object({ applicant_id: z.string(), error: z.string() })),
});

export type AssignResponse = z.infer<typeof AssignResponseSchema>;
