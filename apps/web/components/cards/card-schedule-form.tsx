"use client"

import * as React from "react"
import { Loader2, Save } from "lucide-react"

import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Checkbox } from "../ui/checkbox"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { fromDatetimeLocal, toDatetimeLocal } from "../../lib/date-utils"
import { useScheduleCardsMutation } from "../../query-hooks/cards.api"
import type { CardStatus } from "../../schema/cards.types"

/**
 * Closing date of the application window and the card publishing date.
 * The publishing date follows the closing date unless the organizer
 * unticks "same as closing".
 */
export function CardScheduleForm({ eventId, status }: { eventId: string, status: CardStatus }) {
    const [closesAt, setClosesAt] = React.useState(() => toDatetimeLocal(status.closes_at))
    const [publishAt, setPublishAt] = React.useState(() => toDatetimeLocal(status.publish_at))
    const [same, setSame] = React.useState(() => status.closes_at === status.publish_at)
    const schedule = useScheduleCardsMutation(eventId)

    const effectivePublish = same ? closesAt : publishAt
    const error = !closesAt || !effectivePublish
        ? "Both dates are required."
        : new Date(closesAt) <= new Date()
            ? "The closing date must be in the future. Use \"Close now\" to close immediately."
            : new Date(effectivePublish) < new Date(closesAt)
                ? "Cards cannot be published before applications close."
                : null

    const save = () => {
        if (error) return
        schedule.mutate({
            closes_at: fromDatetimeLocal(closesAt),
            publish_at: fromDatetimeLocal(effectivePublish),
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Schedule</CardTitle>
                <CardDescription>
                    Applications close at the closing date; after that applicants cannot be added or removed.
                    Cards are emailed at the publishing date. Moving the closing date into the future reopens applications.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="closes-at">Applications close</Label>
                    <Input id="closes-at" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="publish-at">Cards are emailed</Label>
                    <Input
                        id="publish-at"
                        type="datetime-local"
                        value={effectivePublish}
                        disabled={same}
                        min={closesAt}
                        onChange={(e) => setPublishAt(e.target.value)}
                    />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                            checked={same}
                            onCheckedChange={(checked) => {
                                setSame(Boolean(checked))
                                if (!checked) setPublishAt(closesAt)
                            }}
                        />
                        Same as closing date
                    </label>
                </div>
                {
                    error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>
                }
            </CardContent>
            <CardFooter className="justify-end">
                <Button onClick={save} disabled={Boolean(error) || schedule.isPending} className="gap-2">
                    {
                        schedule.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />
                    }
                    Save schedule
                </Button>
            </CardFooter>
        </Card>
    )
}
