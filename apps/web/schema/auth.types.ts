import { z } from "zod"

export const AuthUserSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    avatar_url: z.string(),
})

export const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string(),
    trial_choice: z.enum(["claimed", "skipped"]).nullable(),
})

export const MeSchema = z.object({
    user: AuthUserSchema,
    organization: OrganizationSchema.nullable(),
})

export type AuthUser = z.infer<typeof AuthUserSchema>
export type Organization = z.infer<typeof OrganizationSchema>
export type Me = z.infer<typeof MeSchema>

export const OnboardingSchema = z.object({
    name: z.string().trim().min(1, "Organization name is required"),
    phone: z.string().trim(),
})

export type OnboardingValues = z.infer<typeof OnboardingSchema>
