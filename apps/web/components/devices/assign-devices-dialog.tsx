"use client";

import * as React from "react";
import { Check, CheckSquare, Loader2, Smartphone, Square } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog";
import {
    useAssignEventDevicesMutation,
    useAvailableGlobalDevicesQuery,
} from "../../query-hooks/devices.api";
import type { Device } from "../../schema/devices.types";

interface AssignDevicesDialogProps {
    eventId: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export function AssignDevicesDialog({
    eventId,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    trigger,
}: AssignDevicesDialogProps) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setIsOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

    const { data: availableDevices, isLoading } = useAvailableGlobalDevicesQuery(eventId);
    const assignMutation = useAssignEventDevicesMutation();

    const devices = availableDevices || [];

    const handleToggle = (id: string) => {
        setSelectedIds((prev) => {
            return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.length === devices.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(devices.map((d) => d.id));
        }
    };

    const handleAssign = async () => {
        if (selectedIds.length === 0) return;
        await assignMutation.mutateAsync({
            eventId,
            values: { device_ids: selectedIds },
        });
        setSelectedIds([]);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {
                trigger ? <DialogTrigger render={trigger as React.ReactElement} /> : null
            }

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Smartphone className="size-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold">
                                Assign Global Devices to Event
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Select existing scanning hardware from your global terminal pool.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    {
                        isLoading ? <div className="flex h-32 items-center justify-center">
                            <Loader2 className="size-5 animate-spin text-primary" />
                        </div> : null
                    }

                    {
                        !isLoading && devices.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center space-y-1.5">
                            <p className="text-xs font-semibold text-foreground">
                                No available global devices
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                All global devices are already assigned to this event or none exist.
                            </p>
                        </div> : null
                    }

                    {
                        !isLoading && devices.length > 0 ? <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs pb-1 border-b">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleSelectAll}
                                    className="gap-1.5 text-muted-foreground p-0 h-auto font-normal hover:text-foreground hover:bg-transparent"
                                >
                                    {
                                        selectedIds.length === devices.length ? <CheckSquare className="size-4 text-primary" /> : <Square className="size-4" />
                                    }
                                    <span>
                                        {
                                            selectedIds.length === devices.length ? "Deselect All" : "Select All"
                                        }
                                    </span>
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                    {selectedIds.length} of {devices.length} selected
                                </span>
                            </div>

                            <div className="space-y-2">
                                {
                                    devices.map((device) => {
                                        const isSelected = selectedIds.includes(device.id);
                                        return <div
                                            key={device.id}
                                            onClick={() => handleToggle(device.id)}
                                            className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/30 select-none"
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggle(device.id)}
                                                className="mt-0.5"
                                            />
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-semibold text-foreground truncate">
                                                        {device.name}
                                                    </span>
                                                    {
                                                        device.is_paired ? <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5">
                                                            Paired
                                                        </Badge> : <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                                            Unpaired
                                                        </Badge>
                                                    }
                                                </div>
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {device.actual_name || "Hardware not yet connected"}
                                                </p>
                                            </div>
                                        </div>;
                                    })
                                }
                            </div>
                        </div> : null
                    }
                </DialogBody>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={selectedIds.length === 0 || assignMutation.isPending}
                        onClick={handleAssign}
                    >
                        {
                            assignMutation.isPending ? <>
                                <Loader2 className="size-4 animate-spin" />
                                <span>Assigning...</span>
                            </> : <>
                                <Check className="size-4" />
                                <span>Assign {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}</span>
                            </>
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
