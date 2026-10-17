"use client"

import * as React from "react"
import { X } from "lucide-react"

import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import type {
    ApplicantFilter,
    FormFieldSummary,
} from "../../schema/applicants.types"
import {
    getFilterKind,
    getFilterableFields,
    getOptionDisplayLabel,
} from "./applicants-utils"

interface ApplicantFilterBadgesProps {
    filters: ApplicantFilter[]
    fields: FormFieldSummary[]
    onRemoveFilter: (index: number) => void
    onClearFilters: () => void
}

function describeFilter(filter: ApplicantFilter, fields: FormFieldSummary[]) {
    const field = fields.find((f) => f.key === filter.field)
    const label = field?.label ?? filter.field
    if (!field) return { label, value: filter.value }

    switch (getFilterKind(field)) {
        case "boolean":
            return { label, value: filter.value === "true" ? "Yes" : "No" }
        case "options":
            return {
                label,
                value: getOptionDisplayLabel(field.options, filter.value),
            }
        case "range":
            return {
                label,
                value: `${filter.op === "gte" ? "From" : "To"} ${filter.value}`,
            }
        default:
            return { label, value: `"${filter.value}"` }
    }
}

/** Fixed-height strip so adding or removing filters never shifts the table. */
export function ApplicantFilterBadges({
    filters,
    fields,
    onRemoveFilter,
    onClearFilters,
}: ApplicantFilterBadgesProps) {
    const allFields = React.useMemo(() => getFilterableFields(fields), [fields])

    return (
        <div className="no-scrollbar flex h-8 items-center gap-1.5 overflow-x-auto">
            {
                filters.length === 0 ? <span className="text-xs text-muted-foreground">
                    No filters applied
                </span> : <>
                    {
                        filters.map((filter, idx) => {
                            const { label, value } = describeFilter(filter, allFields)
                            return <Badge
                                key={`${filter.field}-${filter.op}-${filter.value}-${idx}`}
                                variant="secondary"
                                className="shrink-0 gap-1.5 border pr-1 pl-2.5 text-[11px] font-normal"
                            >
                                <span className="font-semibold">{label}:</span>
                                <span>{value}</span>
                                <button
                                    type="button"
                                    onClick={() => onRemoveFilter(idx)}
                                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    title="Remove filter"
                                >
                                    <X className="size-3" />
                                </button>
                            </Badge>
                        })
                    }
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClearFilters}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                        Clear all
                    </Button>
                </>
            }
        </div>
    )
}
