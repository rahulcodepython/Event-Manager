"use client";

import axios, { type AxiosRequestConfig } from "axios";
import { ZodArray, type ZodType, type ZodTypeDef } from "zod";

import { API_V1_PREFIX, DEFAULT_API_BASE_URL } from "../lib/constants";
import { ResponseZod, type Response } from "../schema/common.types";

const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
export const apiBaseUrl = `${apiOrigin}${API_V1_PREFIX}`;

// Pages that require a logged-in user. A 401 there means the session is gone.
const PROTECTED_PATHS = ["/dashboard", "/onboarding"];

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message);
    }
}

export const apiClient = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const deviceToken = localStorage.getItem("device_token");
        if (deviceToken) {
            config.headers = config.headers ?? {};
            config.headers["X-Device-Token"] = deviceToken;
        }
    }
    return config;
});

apiClient.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error.response?.status ?? 500;

        // The API already cleared the auth cookies. A full reload on /login
        // logs the user out and drops every cached query.
        if (
            status === 401 &&
            typeof window !== "undefined" &&
            PROTECTED_PATHS.some((p) => window.location.pathname.startsWith(p))
        ) {
            window.location.href = "/login";
        }

        const message =
            error.response?.data?.message ||
            (typeof error.response?.data?.error === "string"
                ? error.response.data.error
                : undefined) ||
            error.message ||
            "Request failed";
        return Promise.reject(new ApiError(status, message));
    },
);

export async function apiRequest<T>(
    config: AxiosRequestConfig,
    schema?: ZodType<T, ZodTypeDef, unknown>,
): Promise<T> {
    const res = await apiClient.request<Response<T>>(config);

    if (schema) {
        const parsed = ResponseZod(schema).parse(res.data);
        // A list schema never yields null: an empty list may arrive without "data".
        if (parsed.data == null && schema instanceof ZodArray) return [] as T;
        return (parsed.data ?? null) as T;
    }

    return (res.data.data ?? null) as T;
}
