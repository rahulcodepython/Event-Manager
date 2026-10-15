/** Parses CSV text (RFC 4180: quoted fields, escaped quotes, CRLF) into rows of cells. */
export function parseCSV(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ""
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') {
                cell += '"'
                i++
            } else if (ch === '"') {
                inQuotes = false
            } else {
                cell += ch
            }
        } else if (ch === '"') {
            inQuotes = true
        } else if (ch === ",") {
            row.push(cell)
            cell = ""
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && text[i + 1] === "\n") i++
            row.push(cell)
            rows.push(row)
            row = []
            cell = ""
        } else {
            cell += ch
        }
    }
    row.push(cell)
    rows.push(row)

    return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

/** Parses CSV with a header row into one object per data row, keyed by lower-cased header. */
export function parseCSVObjects(text: string): Record<string, string>[] {
    const [header, ...rows] = parseCSV(text.replace(/^﻿/, ""))
    if (!header) return []
    const keys = header.map((h) => h.trim().toLowerCase())
    return rows.map((cells) =>
        Object.fromEntries(keys.map((k, i) => [k, (cells[i] ?? "").trim()])),
    )
}

export function toCSV(rows: string[][]): string {
    return rows
        .map((r) =>
            r
                .map((c) =>
                    /[",\r\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c,
                )
                .join(","),
        )
        .join("\n")
}

export function downloadFile(
    filename: string,
    content: string,
    type = "text/csv",
) {
    const url = URL.createObjectURL(new Blob([content], { type }))
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
