/** "15 Oct 2026" from an ISO timestamp or YYYY-MM-DD date. */
export function formatDate(value: string | null | undefined) {
    if (!value) return "—"
    return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

/** "Oct 2026" from YYYY-MM. */
export function formatMonth(month: string) {
    return new Date(`${month}-01`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
}

/** Today as YYYY-MM-DD in local time. */
export function today() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
