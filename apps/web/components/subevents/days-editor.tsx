"use client"

import * as React from "react"
import { Loader2, PlusIcon, Save, Trash2Icon } from "lucide-react"

import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { useSaveSubEventDaysMutation } from "../../query-hooks/subevents.api"
import type { SubEventDay } from "../../schema/subevents.types"

/** A sub-event's days, each with its hours; must fall inside the event's dates. */
export function DaysEditor({ eventId, subEventId, days, minDate, maxDate }: {
    eventId: string
    subEventId: string
    days: SubEventDay[]
    minDate: string
    maxDate: string
}) {
    const [rows, setRows] = React.useState<SubEventDay[]>(days)
    const save = useSaveSubEventDaysMutation(eventId, subEventId)

    const set = (i: number, patch: Partial<SubEventDay>) =>
        setRows((prev) => prev.map((r, j) => j === i ? { ...r, ...patch } : r))

    const dates = rows.map((r) => r.date)
    const error = rows.some((r) => !r.date || !r.start_time || !r.end_time)
        ? "Fill every day's date and hours."
        : rows.some((r) => r.date < minDate || r.date > maxDate)
            ? `Days must be between ${minDate} and ${maxDate}.`
            : rows.some((r) => r.end_time < r.start_time)
                ? "End time must be after start time."
                : new Set(dates).size !== dates.length
                    ? "Each day can be listed once."
                    : null

    const addDay = () => {
        const last = rows[rows.length - 1]
        setRows((prev) => [...prev, { date: last?.date ?? minDate, start_time: last?.start_time ?? "09:00", end_time: last?.end_time ?? "17:00" }])
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Days and hours</CardTitle>
                <CardDescription>Scanners record entry and exit per day. Entry closes when a day&apos;s end time passes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                {
                    rows.length === 0 && <p className="text-sm text-muted-foreground">No days yet.</p>
                }
                {
                    rows.map((r, i) => <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                        <Input type="date" min={minDate} max={maxDate} value={r.date} onChange={(e) => set(i, { date: e.target.value })} />
                        <Input type="time" className="w-28" value={r.start_time} onChange={(e) => set(i, { start_time: e.target.value })} />
                        <Input type="time" className="w-28" value={r.end_time} onChange={(e) => set(i, { end_time: e.target.value })} />
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Remove day"
                            onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                        >
                            <Trash2Icon />
                        </Button>
                    </div>)
                }
                {
                    error && rows.length > 0 && <p className="text-xs text-destructive">{error}</p>
                }
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={addDay}>
                    <PlusIcon className="size-3.5" />
                    Add day
                </Button>
                <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={Boolean(error) || save.isPending}
                    onClick={() => save.mutate([...rows].sort((a, b) => a.date.localeCompare(b.date)))}
                >
                    {
                        save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />
                    }
                    Save days
                </Button>
            </CardFooter>
        </Card>
    )
}
