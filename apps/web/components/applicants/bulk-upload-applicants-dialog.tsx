"use client"

import * as React from "react"
import {
    AlertCircle,
    ArrowLeft,
    Download,
    FileUp,
    Loader2,
    Upload,
} from "lucide-react"

import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog"
import { downloadFile, parseCSVObjects, toCSV } from "../../lib/csv"
import { useBulkCreateApplicantsMutation } from "../../query-hooks/applicants.api"
import type {
    BulkCreateApplicantsResponse,
    CreateApplicantValues,
    FormFieldSummary,
    FormFieldValue,
} from "../../schema/applicants.types"
import {
    BUILT_IN_FIELDS,
    getFilterKind,
    parseOptions,
} from "./applicants-utils"

interface BulkUploadApplicantsDialogProps {
    eventId: string
    formFields: FormFieldSummary[]
    open: boolean
    onOpenChange: (open: boolean) => void
}

interface Column {
    key: string
    label: string
    required: boolean
    hint: string
    field?: FormFieldSummary
}

interface RowError {
    row: number
    error: string
}

const MAX_ROWS = 1000
const MAX_FILE_BYTES = 2 * 1024 * 1024
const BUILT_IN_KEYS = new Set(["name", "email", "phone", "mobile", "user_id"])

function columnHint(field: FormFieldSummary): string {
    const kind = getFilterKind(field)
    const options = parseOptions(field.options).map((o) => o.value)
    if (kind === "boolean") return "true / false"
    if (kind === "options" && field.type === "checkbox")
        return `one or more of: ${options.join(", ")} (separate with ;)`
    if (kind === "options") return `one of: ${options.join(", ")}`
    if (field.type === "date") return "YYYY-MM-DD"
    if (field.type === "time") return "HH:MM"
    if (field.type === "number") return "number"
    return "text"
}

function buildColumns(formFields: FormFieldSummary[]): Column[] {
    const builtIn: Column[] = BUILT_IN_FIELDS.filter(
        (f) => f.key !== "user_id",
    ).map((f) => ({
        key: f.key,
        label: f.label,
        required: true,
        hint:
            f.key === "email"
                ? "valid email"
                : f.key === "phone"
                  ? "with country code, e.g. +919876543210"
                  : "text",
    }))
    const custom: Column[] = formFields
        .filter((f) => !BUILT_IN_KEYS.has(f.key) && f.type !== "photo" && f.type !== "signature")
        .map((f) => ({
            key: f.key,
            label: f.label,
            required: f.required,
            hint: columnHint(f),
            field: f,
        }))
    return [...builtIn, ...custom]
}

/** Converts one raw cell into the value shape the form field stores. */
function toFieldValue(field: FormFieldSummary, raw: string): FormFieldValue {
    const kind = getFilterKind(field)
    if (kind === "boolean")
        return ["true", "yes", "1"].includes(raw.toLowerCase())

    if (kind === "options") {
        const options = parseOptions(field.options)
        const match = (v: string) =>
            options.find(
                (o) =>
                    o.value.toLowerCase() === v.toLowerCase() ||
                    o.label.toLowerCase() === v.toLowerCase(),
            )?.value ?? v
        if (field.type === "checkbox") {
            return raw
                .split(";")
                .map((v) => match(v.trim()))
                .filter(Boolean)
        }
        return match(raw)
    }

    if (field.type === "number" && raw !== "" && !isNaN(Number(raw)))
        return Number(raw)
    return raw
}

function rowsToApplicants(rows: Record<string, unknown>[], columns: Column[]) {
    const applicants: CreateApplicantValues[] = []
    const errors: RowError[] = []

    rows.forEach((row, idx) => {
        const get = (key: string) => {
            const v = row[key]
            return Array.isArray(v) ? v.join(";") : String(v ?? "").trim()
        }

        const missing = columns
            .filter((c) => c.required && !get(c.key))
            .map((c) => c.key)
        if (missing.length > 0) {
            errors.push({
                row: idx + 1,
                error: `missing ${missing.join(", ")}`,
            })
            return
        }
        if (!get("email").includes("@")) {
            errors.push({
                row: idx + 1,
                error: `invalid email "${get("email")}"`,
            })
            return
        }

        const data: Record<string, FormFieldValue> = {}
        for (const col of columns) {
            const raw = get(col.key)
            if (col.field && raw !== "")
                data[col.key] = toFieldValue(col.field, raw)
        }

        applicants.push({
            name: get("name"),
            email: get("email").toLowerCase(),
            phone: get("phone"),
            data,
        })
    })

    return { applicants, errors }
}

async function readRows(file: File): Promise<Record<string, unknown>[]> {
    const text = await file.text()
    if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text)
        if (!Array.isArray(parsed))
            throw new Error("JSON root must be an array of applicant objects")
        return parsed.map((item) =>
            Object.fromEntries(
                Object.entries(
                    item && typeof item === "object" ? item : {},
                ).map(([k, v]) => [k.toLowerCase(), v]),
            ),
        )
    }
    return parseCSVObjects(text)
}

export function BulkUploadApplicantsDialog({
    eventId,
    formFields,
    open,
    onOpenChange,
}: BulkUploadApplicantsDialogProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const mutation = useBulkCreateApplicantsMutation(eventId)

    const [step, setStep] = React.useState<"format" | "upload">("format")
    const [fileName, setFileName] = React.useState("")
    const [parseError, setParseError] = React.useState("")
    const [applicants, setApplicants] = React.useState<CreateApplicantValues[]>(
        [],
    )
    const [rowErrors, setRowErrors] = React.useState<RowError[]>([])
    const [result, setResult] =
        React.useState<BulkCreateApplicantsResponse | null>(null)

    const columns = React.useMemo(() => buildColumns(formFields), [formFields])

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setStep("format")
            setFileName("")
            setParseError("")
            setApplicants([])
            setRowErrors([])
            setResult(null)
        }
        onOpenChange(next)
    }

    const downloadTemplate = () => {
        const example = columns.map((c) => {
            if (c.key === "name") return "Jane Doe"
            if (c.key === "email") return "jane@example.com"
            if (c.key === "phone") return "+919876543210"
            return ""
        })
        downloadFile(
            "applicants-template.csv",
            toCSV([columns.map((c) => c.key), example]),
        )
    }

    const handleFile = async (file: File) => {
        setFileName(file.name)
        setParseError("")
        setApplicants([])
        setRowErrors([])
        setResult(null)

        if (file.size > MAX_FILE_BYTES) {
            setParseError("File is larger than 2MB")
            return
        }
        try {
            const rows = await readRows(file)
            if (rows.length === 0) throw new Error("File has no applicant rows")
            if (rows.length > MAX_ROWS)
                throw new Error(
                    `File has ${rows.length} rows; the limit is ${MAX_ROWS}`,
                )
            const parsed = rowsToApplicants(rows, columns)
            setApplicants(parsed.applicants)
            setRowErrors(parsed.errors)
        } catch (err) {
            setParseError(
                err instanceof Error ? err.message : "Could not read file",
            )
        }
    }

    const handleUpload = async () => {
        try {
            setResult(await mutation.mutateAsync(applicants))
        } catch {
            // Handled by mutation toast
        }
    }

    const problems = [
        ...rowErrors.map((e) => `Row ${e.row}: ${e.error}`),
        ...(result?.failed ?? []).map(
            (f) => `${f.email || `Row ${f.row}`}: ${f.error}`,
        ),
    ]

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">
                        Bulk Upload Applicants
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {step === "format"
                            ? "Prepare a CSV or JSON file with these columns. Column names are the field keys."
                            : `Upload a CSV or JSON file with up to ${MAX_ROWS} applicants (max 2MB).`}
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    {
                        step === "format" ? <>
                            <div className="overflow-hidden rounded-md border">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/50 text-left">
                                        <tr>
                                            <th className="px-3 py-2 font-semibold">
                                                Column
                                            </th>
                                            <th className="px-3 py-2 font-semibold">
                                                Field
                                            </th>
                                            <th className="px-3 py-2 font-semibold">
                                                Format
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            columns.map((c) => <tr
                                                key={c.key}
                                                className="border-t"
                                            >
                                                <td className="px-3 py-2 font-mono">
                                                    {c.key}
                                                    {
                                                        c.required && <span className="text-destructive">
                                                            {" "}
                                                            *
                                                        </span>
                                                    }
                                                </td>
                                                <td className="px-3 py-2">
                                                    {c.label}
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {c.hint}
                                                </td>
                                            </tr>
                                            )
                                        }
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                CSV: first row is the header. JSON: an array of
                                objects using the same keys.
                            </p>
                        </> : <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.json,text/csv,application/json"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleFile(file)
                                    e.target.value = ""
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full gap-2"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FileUp className="size-4 text-primary" />
                                <span>
                                    {fileName || "Choose File (CSV or JSON)"}
                                </span>
                            </Button>

                            {
                                parseError && <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                                    <span>{parseError}</span>
                                </div>
                            }

                            {
                                fileName && !parseError && <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <Badge variant="secondary">
                                        {applicants.length} ready
                                    </Badge>
                                    {
                                        rowErrors.length > 0 && <Badge variant="destructive">
                                            {rowErrors.length} invalid (skipped)
                                        </Badge>
                                    }
                                    {
                                        result && <Badge>{result.created} uploaded</Badge>
                                    }
                                    {
                                        result && result.failed.length > 0 && <Badge variant="destructive">
                                            {result.failed.length} rejected
                                        </Badge>
                                    }
                                </div>
                            }

                            {
                                problems.length > 0 && <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                                    {
                                        problems.map((p, i) => <li key={i}>{p}</li>
                                        )
                                    }
                                </ul>
                            }
                        </>
                    }
                </DialogBody>

                <DialogFooter>
                    {
                        step === "format" ? <>
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-1.5"
                                onClick={downloadTemplate}
                            >
                                <Download className="size-4" />
                                <span>Download Template</span>
                            </Button>
                            <Button
                                type="button"
                                className="gap-1.5"
                                onClick={() => setStep("upload")}
                            >
                                <span>Continue</span>
                            </Button>
                        </> : result ? <Button
                            type="button"
                            onClick={() => handleOpenChange(false)}
                        >
                            Done
                        </Button> : <>
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => setStep("format")}
                            >
                                <ArrowLeft className="size-4" />
                                <span>Format</span>
                            </Button>
                            <Button
                                type="button"
                                className="gap-1.5"
                                disabled={
                                    applicants.length === 0 ||
                                    mutation.isPending
                                }
                                onClick={handleUpload}
                            >
                                {
                                    mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />
                                }
                                <span>
                                    Upload {applicants.length || ""} Applicants
                                </span>
                            </Button>
                        </>
                    }
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
