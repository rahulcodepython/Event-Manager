"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Button } from "../ui/button"
import { Input } from "../ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select"
import type {
    ApplicantFilter,
    FormFieldSummary,
} from "../../schema/applicants.types"
import {
    getFilterKind,
    getFilterableFields,
    parseOptions,
} from "./applicants-utils"

interface ApplicantFilterFormProps {
    fields: FormFieldSummary[]
    onAddFilter: (filter: ApplicantFilter) => void
}

const BOOLEAN_OPTIONS = [
    { label: "Yes", value: "true" },
    { label: "No", value: "false" },
]

/** Single-row filter builder: attribute, value, add. */
export function ApplicantFilterForm({
    fields,
    onAddFilter,
}: ApplicantFilterFormProps) {
    const filterable = React.useMemo(
        () => getFilterableFields(fields),
        [fields],
    )

    const [fieldKey, setFieldKey] = React.useState("name")
    const [value, setValue] = React.useState("")
    const [to, setTo] = React.useState("")

    const field = filterable.find((f) => f.key === fieldKey) ?? filterable[0]
    const kind = getFilterKind(field)
    const options =
        kind === "boolean" ? BOOLEAN_OPTIONS : parseOptions(field.options)

    const selectField = (key: string) => {
        setFieldKey(key)
        setValue("")
        setTo("")
    }

    const canAdd =
        kind === "range" ? Boolean(value || to) : Boolean(value.trim())

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canAdd) return

        if (kind === "range") {
            if (value) onAddFilter({ field: field.key, op: "gte", value })
            if (to) onAddFilter({ field: field.key, op: "lte", value: to })
        } else if (kind === "text") {
            onAddFilter({
                field: field.key,
                op: "contains",
                value: value.trim(),
            })
        } else {
            const isMultiChoice =
                field.type === "checkbox" && kind === "options"
            onAddFilter({
                field: field.key,
                op: isMultiChoice ? "contains" : "eq",
                value,
            })
        }

        setValue("")
        setTo("")
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
        >
            <Select
                value={field.key}
                items={filterable.map((f) => ({
                    label: f.label,
                    value: f.key,
                }))}
                onValueChange={(key) => key && selectField(key)}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Attribute" />
                </SelectTrigger>
                <SelectContent>
                    {
                        filterable.map((f) => <SelectItem key={f.key} value={f.key}>
                            {f.label}
                        </SelectItem>
                        )
                    }
                </SelectContent>
            </Select>

            {
                kind === "text" && <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`Filter by ${field.label.toLowerCase()}...`}
                    className="w-48"
                />
            }

            {
                (kind === "options" || kind === "boolean") && <Select
                    value={value}
                    items={options}
                    onValueChange={(v) => setValue(v ?? "")}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Choose value" />
                    </SelectTrigger>
                    <SelectContent>
                        {
                            options.map((opt) => <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                            )
                        }
                    </SelectContent>
                </Select>
            }

            {
                kind === "range" && <>
                    <Input
                        type={field.type}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        aria-label="From"
                        className="w-36"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                        type={field.type}
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        aria-label="To"
                        className="w-36"
                    />
                </>
            }

            <Button
                type="submit"
                variant="outline"
                disabled={!canAdd}
                className="gap-1.5"
            >
                <Plus className="size-4" />
                <span>Filter</span>
            </Button>
        </form>
    )
}
