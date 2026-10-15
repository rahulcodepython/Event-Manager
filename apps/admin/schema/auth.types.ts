import { z } from "zod"

export const AdminMeSchema = z.object({
    username: z.string(),
})

export type AdminMe = z.infer<typeof AdminMeSchema>

export const LoginSchema = z.object({
    username: z.string().trim().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
})

export type LoginValues = z.infer<typeof LoginSchema>
