"use client"

import axios, { type AxiosRequestConfig } from "axios"
import type { ZodType, ZodTypeDef } from "zod"

import { API_V1_PREFIX, DEFAULT_ADMIN_API_BASE_URL } from "../lib/constants"
import { ResponseZod, type Response } from "../schema/common.types"

const apiOrigin = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || DEFAULT_ADMIN_API_BASE_URL
export const apiBaseUrl = `${apiOrigin}${API_V1_PREFIX}`

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message)
    }
}

export const apiClient = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
})

apiClient.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error.response?.status ?? 500

        // Every page but /login needs the admin session. The API already
        // cleared the cookies; a full reload drops every cached query.
        if (status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
            window.location.href = "/login"
        }

        const message =
            error.response?.data?.message ||
            (typeof error.response?.data?.error === "string" ? error.response.data.error : undefined) ||
            error.message ||
            "Request failed"
        return Promise.reject(new ApiError(status, message))
    },
)

export async function apiRequest<T>(
    config: AxiosRequestConfig,
    schema?: ZodType<T, ZodTypeDef, unknown>,
): Promise<T> {
    const res = await apiClient.request<Response<T>>(config)

    if (schema) {
        const parsed = ResponseZod(schema).parse(res.data)
        return (parsed.data ?? null) as T
    }

    return (res.data.data ?? null) as T
}
