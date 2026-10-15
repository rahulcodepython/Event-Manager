"use client"

import * as React from "react"
import { ExternalLink, Loader2, Plus, ScanLine, Search } from "lucide-react"

import { PageHeader } from "../../../components/generic"
import { Button } from "../../../components/ui/button"
import { Card } from "../../../components/ui/card"
import { Input } from "../../../components/ui/input"
import { CreateDeviceDialog } from "../../../components/devices/create-device-dialog"
import { GlobalDevicesTable } from "../../../components/devices/global-devices-table"
import { useBreadcrumbs } from "../../../hooks/use-breadcrumbs"
import { useDevicesQuery } from "../../../query-hooks/devices.api"
import type { Device } from "../../../schema/devices.types"

export default function GlobalDevicesPage() {
    const [search, setSearch] = React.useState("")
    const [isCreateOpen, setIsCreateOpen] = React.useState(false)

    useBreadcrumbs([
        { title: "Dashboard", url: "/dashboard" },
        { title: "Devices" },
    ])

    const {
        data: devicesData,
        isLoading,
        isError,
        error,
    } = useDevicesQuery({ search })
    const devices: Device[] = devicesData?.data || []

    return (
        <div className="flex flex-col gap-4 w-full max-w-full min-w-0">
            <PageHeader
                title="Global Scanner Devices"
                description="Central terminal pool of scanning hardware verified with unique device fingerprinting."
                actions={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                window.open("/devices/pair", "_blank")
                            }
                            className="gap-2 font-medium"
                        >
                            <ExternalLink className="size-4" />
                            <span>Pair Screen</span>
                        </Button>
                        <Button
                            type="button"
                            variant="default"
                            onClick={() => setIsCreateOpen(true)}
                            className="gap-2 font-semibold"
                        >
                            <Plus className="size-4" />
                            <span>Add Device</span>
                        </Button>
                    </>
                }
            />

            {/* Filter and Search */}
            <div className="flex items-center gap-2 px-1">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search devices by name or hardware..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 pl-9 text-sm bg-background"
                    />
                </div>
            </div>

            {/* Loading / Error States */}
            {isLoading && (
                <div className="flex h-64 w-full items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <span>Loading scanner devices...</span>
                    </div>
                </div>
            )}

            {isError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center text-xs text-destructive">
                    {error?.message || "Failed to load scanner devices"}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && devices.length === 0 && (
                <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <ScanLine className="size-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                            No Devices Found
                        </p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                            {search
                                ? "No devices match your search criteria. Try a different query."
                                : "Create your first scanner device terminal to generate a 5-minute pairing PIN."}
                        </p>
                    </div>
                    {!search && (
                        <Button
                            type="button"
                            variant="default"
                            onClick={() => setIsCreateOpen(true)}
                            className="gap-1.5 text-xs font-semibold mt-2"
                        >
                            <Plus className="size-3.5" />
                            <span>Create First Device</span>
                        </Button>
                    )}
                </Card>
            )}

            {/* Table */}
            {!isLoading && !isError && devices.length > 0 && (
                <GlobalDevicesTable devices={devices} />
            )}

            {/* Create Device Dialog */}
            <CreateDeviceDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />
        </div>
    )
}
