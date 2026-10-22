"use client";

import { apiBaseUrl } from "../../react-query/client";

/** An applicant's photo or signature, served by the API with the session cookie. */
export function ApplicantImage({ eventId, applicantId, fieldKey, type, className }: {
    eventId: string;
    applicantId: string;
    fieldKey: string;
    type: string;
    className?: string;
}) {
    const src = `${apiBaseUrl}/events/${eventId}/applicants/${encodeURIComponent(applicantId)}/files/${encodeURIComponent(fieldKey)}`;
    return (
        <a href={src} target="_blank" rel="noreferrer" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element -- authenticated API image */}
            <img
                src={src}
                alt={type}
                loading="lazy"
                className={className ?? (type === "photo" ? "size-10 rounded-md object-cover" : "h-8 max-w-28 rounded border bg-white object-contain")}
            />
        </a>
    );
}

/** Links to an applicant's File Upload file(s), served by the API with the session cookie. */
export function ApplicantFileLinks({ eventId, applicantId, fieldKey, value }: {
    eventId: string;
    applicantId: string;
    fieldKey: string;
    /** The stored key, or keys for a multi-file field. */
    value: unknown;
}) {
    const count = Array.isArray(value) ? value.length : value ? 1 : 0;
    const base = `${apiBaseUrl}/events/${eventId}/applicants/${encodeURIComponent(applicantId)}/files/${encodeURIComponent(fieldKey)}`;
    return (
        <span className="flex flex-wrap gap-x-2 gap-y-1">
            {
                Array.from({ length: count }, (_, i) => <a key={i} href={`${base}?i=${i}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary underline-offset-2 hover:underline">
                    {count > 1 ? `File ${i + 1}` : "Download"}
                </a>)
            }
        </span>
    );
}
