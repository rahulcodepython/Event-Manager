import { z } from "zod";

import { FormFieldSchema } from "./forms.types";

export const FormFieldValueSchema = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null(),
]);

export type FormFieldValue = z.infer<typeof FormFieldValueSchema>;

export const PublicEventInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    venue: z.string().nullish(),
    logo: z.string().nullish(),
    organizer: z.string().nullish(),
});

export type PublicEventInfo = z.infer<typeof PublicEventInfoSchema>;

export const PublicFormInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    fields: z.array(FormFieldSchema),
});

export type PublicFormInfo = z.infer<typeof PublicFormInfoSchema>;

export const PublicSubEventOptionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    venue: z.string(),
    link_enabled: z.boolean(),
    is_full: z.boolean(),
    days: z.array(z.object({ date: z.string(), start_time: z.string(), end_time: z.string() })),
});

export type PublicSubEventOption = z.infer<typeof PublicSubEventOptionSchema>;

export const PublicApplyConfigSchema = z.object({
    event_form_id: z.string(),
    status: z.enum(["waiting", "live"]),
    is_expired: z.boolean(),
    is_full: z.boolean(),
    max_applicants: z.number(),
    current_applicants: z.number(),
    branding: z.boolean().default(false),
    sub_events: z.object({
        mode: z.enum(["off", "one", "many"]),
        required: z.boolean(),
        options: z.array(PublicSubEventOptionSchema),
    }).default({ mode: "off", required: false, options: [] }),
    expires_at: z.string(),
    event: PublicEventInfoSchema.nullish(),
    form: PublicFormInfoSchema.nullish(),
});

export type PublicApplyConfig = z.infer<typeof PublicApplyConfigSchema>;
export type PublicApplyConfigResponse = PublicApplyConfig;

export const SubmitApplicationSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Mobile number is required"),
    data: z.record(z.string(), FormFieldValueSchema).default({}),
    sub_event_ids: z.array(z.string()).optional(),
    /** The sub-event of the link the form was opened with. */
    sub_event_link: z.string().optional(),
});

export type SubmitApplicationInput = z.infer<typeof SubmitApplicationSchema>;

export function buildPublicApplyFormSchema(
    fields: z.infer<typeof FormFieldSchema>[] = []
) {
    const dataShape: Record<string, z.ZodTypeAny> = {};

    for (const field of fields) {
        if (
            field.is_system &&
            (field.key === "name" || field.key === "email" || field.key === "phone")
        ) {
            continue;
        }

        let fieldSchema: z.ZodTypeAny;

        switch (field.type) {
            case "photo":
            case "signature": {
                // The value is the upload token.
                fieldSchema = field.required
                    ? z.string().min(1, `${field.label} is required`)
                    : z.string().default("");
                break;
            }
            case "phone": {
                const pStr = z.string();
                fieldSchema = field.required
                    ? pStr.refine(
                          (val) => val.replace(/\D/g, "").length >= 10,
                          {
                              message: `${field.label} must contain a valid country code and 10-digit mobile number`,
                          }
                      )
                    : pStr.refine(
                          (val) => !val || val.replace(/\D/g, "").length >= 10,
                          {
                              message: `${field.label} must contain a valid country code and 10-digit mobile number`,
                          }
                      ).optional().default("");
                break;
            }
            case "number": {
                let num = z.coerce.number({
                    invalid_type_error: `${field.label} must be a valid number`,
                });
                if (field.validation?.min != null) {
                    num = num.min(
                        field.validation.min,
                        `${field.label} must be at least ${field.validation.min}`
                    );
                }
                if (field.validation?.max != null) {
                    num = num.max(
                        field.validation.max,
                        `${field.label} must be at most ${field.validation.max}`
                    );
                }

                let validatedNum: z.ZodTypeAny = num;
                if (
                    field.validation?.min_length != null ||
                    field.validation?.max_length != null
                ) {
                    const minLen = field.validation?.min_length;
                    const maxLen = field.validation?.max_length;
                    validatedNum = validatedNum.refine(
                        (val) => {
                            if (typeof val !== "number") return true;
                            const strLen = String(Math.abs(val)).length;
                            if (minLen != null && strLen < minLen) return false;
                            if (maxLen != null && strLen > maxLen) return false;
                            return true;
                        },
                        {
                            message: `${field.label} must have ${
                                minLen != null && maxLen != null
                                    ? `between ${minLen} and ${maxLen} digits`
                                    : minLen != null
                                      ? `at least ${minLen} digits`
                                      : `at most ${maxLen} digits`
                            }`,
                        }
                    );
                }

                fieldSchema = field.required
                    ? validatedNum
                    : z
                          .union([
                              validatedNum,
                              z.literal(""),
                              z.null(),
                              z.undefined(),
                          ])
                          .optional();
                break;
            }
            case "checkbox": {
                const arr = z.array(z.string());
                fieldSchema = field.required
                    ? arr.min(1, `Please select at least one ${field.label}`)
                    : arr.default([]);
                break;
            }
            case "switch": {
                fieldSchema = z.boolean().default(false);
                break;
            }
            default: {
                // text, textarea, email, url, date, time, month, week, file
                let str = z.string();
                if (field.type === "email") {
                    str = str.email("Invalid email address");
                } else if (field.type === "url") {
                    str = str.url("Invalid URL");
                }

                if (field.validation?.min_length != null) {
                    str = str.min(
                        field.validation.min_length,
                        `${field.label} must be at least ${field.validation.min_length} characters`
                    );
                }
                if (field.validation?.max_length != null) {
                    str = str.max(
                        field.validation.max_length,
                        `${field.label} must be at most ${field.validation.max_length} characters`
                    );
                }

                fieldSchema = field.required
                    ? str.trim().min(1, `${field.label} is required`)
                    : str.default("");
                break;
            }
        }

        dataShape[field.key] = fieldSchema;
    }

    return z.object({
        name: z.string().trim().min(1, "Full Name is required"),
        email: z.string().trim().email("Please enter a valid email address"),
        phone: z
            .string()
            .trim()
            .refine(
                (val) => val.replace(/\D/g, "").length >= 10,
                { message: "Please enter a valid 10-digit mobile number with country code" }
            ),
        data: z.object(dataShape).default({}),
    });
}

export type PublicApplyFormValues = {
    name: string;
    email: string;
    phone: string;
    data: Record<string, FormFieldValue>;
};

export const SubmitApplicationResponseSchema = z.object({
    user_id: z.string(),
    status: z.string().optional(),
    message: z.string(),
    created_at: z.string(),
});

export type SubmitApplicationResponse = z.infer<
    typeof SubmitApplicationResponseSchema
>;
