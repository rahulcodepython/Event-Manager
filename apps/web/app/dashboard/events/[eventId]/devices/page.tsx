"use client"

import * as React from "react"
import { ExternalLink, Layers, Loader2, ScanLine } from "lucide-react"

import { Button } from "../../../../../components/ui/button"
import { Card } from "../../../../../components/ui/card"
import { AssignDevicesDialog } from "../../../../../components/devices/assign-devices-dialog"
import { EventDevicesTable } from "../../../../../components/devices/event-devices-table"
import { useEventPage } from "../../../../../components/events/event-context"
import { PageHeader } from "../../../../../components/generic"
import { useEventDevicesQuery } from "../../../../../query-hooks/devices.api"
import type { EventDeviceAssignment } from "../../../../../schema/devices.types"

export default function EventDevicesPage() {
    const { event, eventId } = useEventPage("Devices")
    const {
        data: assignmentsData,
        isLoading,
        isError,
        error,
    } = useEventDevicesQuery(eventId)

    const [isAssignOpen, setIsAssignOpen] = React.useState(false)

    const assignments: EventDeviceAssignment[] = assignmentsData || []

    return (
        <>
            <PageHeader
                title="Event Scanner Terminals"
                description={`Scanning hardware authorized to check in attendees for ${event.name}.`}
                actions={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                window.open("/devices/pair", "_blank")
                            }
                            className="gap-1.5 text-xs font-medium"
                        >
                            <ExternalLink className="size-3.5" />
                            <span>Pair Screen</span>
                        </Button>

                        <Button
                            type="button"
                            variant="default"
                            onClick={() => setIsAssignOpen(true)}
                            className="gap-1.5 text-xs font-semibold"
                        >
                            <Layers className="size-3.5" />
                            <span>Assign Devices</span>
                        </Button>
                    </>
                }
            />

            {/* Loading / Error States */}
            {isLoading && (
                <div className="flex h-64 w-full items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <span>Loading event devices...</span>
                    </div>
                </div>
            )}

            {isError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center text-xs text-destructive">
                    {error?.message || "Failed to load event devices"}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && assignments.length === 0 && (
                <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <ScanLine className="size-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                            No Devices Assigned
                        </p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                            Assign existing terminals from your global devices
                            inventory to scan attendees for this event.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <Button
                            type="button"
                            variant="default"
                            onClick={() => setIsAssignOpen(true)}
                            className="gap-1.5 text-xs font-semibold"
                        >
                            <Layers className="size-3.5" />
                            <span>Assign from Global Pool</span>
                        </Button>
                    </div>
                </Card>
            )}

            {/* Table */}
            {!isLoading && !isError && assignments.length > 0 && (
                <EventDevicesTable
                    assignments={assignments}
                    eventId={eventId}
                />
            )}

            {/* Assign Global Devices Dialog */}
            <AssignDevicesDialog
                eventId={eventId}
                open={isAssignOpen}
                onOpenChange={setIsAssignOpen}
            />
        </>
    )
}
