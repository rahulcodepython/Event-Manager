import { z } from "zod"

import { CatalogSchema, QuoteSchema, type Catalog, type Quote, type Selection } from "./pricing.types"

const apiBase = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/api/v1`

/** The client app; sign-up and login happen there (Google login). */
export const appUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"
export const loginUrl = `${appUrl}/login`

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message)
    }
}

async function request<T>(path: string, init: RequestInit, schema?: z.ZodType<T>): Promise<T> {
    const res = await fetch(`${apiBase}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...init.headers },
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
        throw new ApiError(res.status, body?.message || "Request failed")
    }
    return schema ? schema.parse(body?.data) : (body?.data as T)
}

export function getCatalog(init: RequestInit = {}): Promise<Catalog> {
    return request("/pricing/catalog", { method: "GET", ...init }, CatalogSchema)
}

export function getQuote(selections: Selection[]): Promise<Quote> {
    return request("/pricing/quote", { method: "POST", body: JSON.stringify({ selections }) }, QuoteSchema)
}

export type ContactInput = { name: string, email: string, message: string, website: string }

export function sendContact(input: ContactInput): Promise<void> {
    return request("/public/contact", { method: "POST", body: JSON.stringify(input) })
}
