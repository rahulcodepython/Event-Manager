import { z } from "zod";

export const SiteSchema = z.object({
    /** The event's credit includes an event website. */
    entitled: z.boolean(),
    slug: z.string().nullable(),
    url: z.string().nullable(),
    has_files: z.boolean(),
    file_count: z.number(),
    total_bytes: z.number(),
    uploaded_at: z.string().nullable(),
    /** Served right now: files uploaded, credit active. */
    live: z.boolean(),
});

export type Site = z.infer<typeof SiteSchema>;

export const SlugCheckSchema = z.object({
    slug: z.string(),
    available: z.boolean(),
    reason: z.string().optional(),
});

export type SlugCheck = z.infer<typeof SlugCheckSchema>;

/** The site address for a slug, from NEXT_PUBLIC_SITES_URL_TEMPLATE. */
export function siteUrl(slug: string): string {
    const template = process.env.NEXT_PUBLIC_SITES_URL_TEMPLATE || "http://{slug}.sites.localhost:8002";
    return template.replace("{slug}", slug || "your-name");
}
