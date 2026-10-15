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
