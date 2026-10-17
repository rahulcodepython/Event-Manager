"use client"

import * as React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Switch } from "../ui/switch"
import { useSubEventSettingsMutation } from "../../query-hooks/subevents.api"
import type { SubEventMode, SubEventsOverview } from "../../schema/subevents.types"

const MODE_ITEMS = [
    { value: "off", label: "Off: organizer assigns only" },
    { value: "one", label: "Applicants pick one" },
    { value: "many", label: "Applicants pick any number" },
]

/** How applicants choose sub-events on the public registration form. */
export function SelfEnrollSettings({ eventId, overview, locked }: {
    eventId: string
    overview: SubEventsOverview
    /** Applications are closed: settings and enrollments are frozen. */
    locked: boolean
}) {
    const save = useSubEventSettingsMutation(eventId)
    const { settings } = overview
    const disabled = !settings.has_form || locked || save.isPending

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">On the registration form</CardTitle>
                <CardDescription>
                    {
                        !settings.has_form ? "Create the registration form first." : locked ? "Applications are closed, so enrollment is frozen." : "Let applicants choose sub-events when they register."
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-2">
                    <Label>Choice</Label>
                    <Select
                        value={settings.mode}
                        items={MODE_ITEMS}
                        disabled={disabled}
                        onValueChange={(v) => v && save.mutate({ mode: v as SubEventMode, required: v === "off" ? false : settings.required })}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {
                                MODE_ITEMS.map((m) => <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                </SelectItem>)
                            }
                        </SelectContent>
                    </Select>
                </div>
                <label className="flex items-center gap-2 pb-1.5 text-sm">
                    <Switch
                        checked={settings.required}
                        disabled={disabled || settings.mode === "off"}
                        onCheckedChange={(required) => save.mutate({ mode: settings.mode, required })}
                    />
                    Choice required
                </label>
            </CardContent>
        </Card>
    )
}
