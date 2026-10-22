import { apiBaseUrl } from "../react-query/client";

/**
 * Uploads one file for an upload field of a public form and returns its
 * token. The form submission exchanges the token for the stored file.
 */
export async function uploadFormFile(eventFormId: string, fieldKey: string, blob: Blob, name: string): Promise<string> {
    const body = new FormData();
    body.append("file", blob, name);
    const res = await fetch(`${apiBaseUrl}/public/apply/${eventFormId}/uploads?field=${encodeURIComponent(fieldKey)}`, {
        method: "POST",
        body,
        // The applicant session cookie lives on the API origin.
        credentials: "include",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.message || "Upload failed");
    return json.data.token as string;
}
