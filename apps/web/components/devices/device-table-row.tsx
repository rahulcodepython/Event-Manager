"use client";

import * as React from "react";
import Link from "next/link";
import {
    ArrowUpRight,
    Calendar,
    Edit,
    ExternalLink,
    RefreshCw,
    Smartphone,
    Trash2,
    Unlink,
} from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogBody,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "../ui/context-menu";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { DevicePINDisplay } from "./device-pin-display";
import { DeviceStatusBadge } from "./device-status-badge";
import {
    useDeleteDeviceMutation,
    useRegeneratePINMutation,
    useUnassignEventDeviceMutation,
    useUpdateDeviceMutation,
} from "../../query-hooks/devices.api";
import type { Device } from "../../schema/devices.types";

interface DeviceTableRowProps {
    device: Device;
    eventId?: string;
    assignedDate?: string;
    formatTTL?: (expiresAt?: string | null) => string;
}

export function DeviceTableRow({
    device,
    eventId,
    assignedDate,
    formatTTL,
}: DeviceTableRowProps) {
    const [isEditOpen, setIsEditOpen] = React.useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [isUnassignOpen, setIsUnassignOpen] = React.useState(false);

    const [name, setName] = React.useState(device.name);
    const [isUnlimitedTTL, setIsUnlimitedTTL] = React.useState(device.expires_at == null);

    const formatForDatetimeLocal = (isoString?: string | null) => {
        if (!isoString) return "";
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return "";
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch {
            return "";
        }
    };

    const [expiresAt, setExpiresAt] = React.useState(() => formatForDatetimeLocal(device.expires_at));

    const regenerateMutation = useRegeneratePINMutation();
    const updateMutation = useUpdateDeviceMutation();
    const deleteMutation = useDeleteDeviceMutation();
    const unassignMutation = useUnassignEventDeviceMutation();

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;

        const targetExpires = !isUnlimitedTTL && expiresAt ? new Date(expiresAt).toISOString() : null;

        await updateMutation.mutateAsync({
            id: device.id,
            values: { name: trimmed, expires_at: targetExpires },
        });
        setIsEditOpen(false);
    };

    const handleConfirmDelete = async () => {
        await deleteMutation.mutateAsync({ id: device.id });
        setIsDeleteOpen(false);
    };

    const handleConfirmUnassign = async () => {
        if (!eventId) return;
        await unassignMutation.mutateAsync({ eventId, deviceId: device.id });
        setIsUnassignOpen(false);
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger
                    render={
                        <tr className="hover:bg-muted/25 transition-colors cursor-context-menu select-none border-b last:border-0">
                            {/* Column 1: Terminal Name (Redirect Link with Hover Highlight) */}
                            <td className="py-3 px-4">
                                <Link
                                    href="/devices/pair"
                                    className="group/link flex items-center gap-2.5"
                                    title="Click to visit Device Pair page (or right click row for actions)"
                                >
                                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover/link:bg-primary group-hover/link:text-primary-foreground transition-colors shrink-0">
                                        <Smartphone className="size-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-semibold text-foreground text-xs group-hover/link:text-primary group-hover/link:underline underline-offset-4 decoration-primary/50 transition-colors truncate">
                                                {device.name}
                                            </p>
                                            <ArrowUpRight className="size-3 text-primary opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all shrink-0" />
                                        </div>
                                        <p className="text-[11px] text-muted-foreground truncate">
                                            {device.actual_name || "Hardware unverified"}
                                        </p>
                                    </div>
                                </Link>
                            </td>

                            {/* Column 2: Status */}
                            <td className="py-3 px-4 whitespace-nowrap">
                                <DeviceStatusBadge device={device} />
                            </td>

                            {/* Column 3: Fingerprint */}
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                                {device.fingerprint ? (
                                    <span className="truncate block max-w-[140px]" title={device.fingerprint}>
                                        {device.fingerprint}
                                    </span>
                                ) : (
                                    <span className="italic text-[11px]">None</span>
                                )}
                            </td>

                            {/* Column 4: Expiration or Assigned Date */}
                            {assignedDate ? (
                                <td className="py-3 px-4 whitespace-nowrap text-muted-foreground text-[11px]">
                                    {assignedDate}
                                </td>
                            ) : (
                                <td className="py-3 px-4 whitespace-nowrap text-muted-foreground text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="size-3 text-muted-foreground" />
                                        <span>{formatTTL ? formatTTL(device.expires_at) : "Unlimited"}</span>
                                    </div>
                                </td>
                            )}

                            {/* Column 5: PIN / Pair Key (if global table) */}
                            {!assignedDate && (
                                <td className="py-3 px-4 whitespace-nowrap">
                                    <DevicePINDisplay device={device} />
                                </td>
                            )}
                        </tr>
                    }
                />

                <ContextMenuContent className="w-56">
                    <ContextMenuItem
                        onClick={() => window.open("/devices/pair", "_blank")}
                        className="gap-2.5"
                    >
                        <ExternalLink className="size-3.5 text-primary" />
                        <span>Visit Pair Page</span>
                    </ContextMenuItem>

                    <ContextMenuItem
                        onClick={() => window.open("/devices/scan", "_blank")}
                        className="gap-2.5"
                    >
                        <Smartphone className="size-3.5 text-primary" />
                        <span>Visit Scanner Terminal</span>
                    </ContextMenuItem>

                    <ContextMenuSeparator />

                    <ContextMenuItem
                        onClick={() => regenerateMutation.mutate({ id: device.id })}
                        disabled={regenerateMutation.isPending}
                        className="gap-2.5"
                    >
                        <RefreshCw className="size-3.5" />
                        <span>Regenerate PIN</span>
                    </ContextMenuItem>

                    <ContextMenuItem
                        onClick={() => {
                            setName(device.name);
                            setIsUnlimitedTTL(device.expires_at == null);
                            setExpiresAt(formatForDatetimeLocal(device.expires_at));
                            setIsEditOpen(true);
                        }}
                        className="gap-2.5"
                    >
                        <Edit className="size-3.5" />
                        <span>Edit Device & TTL</span>
                    </ContextMenuItem>

                    {eventId ? (
                        <>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                                onClick={() => setIsUnassignOpen(true)}
                                className="gap-2.5 text-amber-600 dark:text-amber-400 focus:text-amber-600"
                            >
                                <Unlink className="size-3.5" />
                                <span>Remove from Event</span>
                            </ContextMenuItem>
                        </>
                    ) : null}

                    <ContextMenuSeparator />

                    <ContextMenuItem
                        onClick={() => setIsDeleteOpen(true)}
                        variant="destructive"
                        className="gap-2.5"
                    >
                        <Trash2 className="size-3.5" />
                        <span>Delete Device</span>
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            {/* Edit Device Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Scanner Device</DialogTitle>
                        <DialogDescription>
                            Update terminal label and device session expiration limit.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 min-h-0">
                        <DialogBody className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Device Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-10 text-sm"
                                    required
                                />
                            </div>

                            <div className="space-y-2 pt-1 border-t">
                                <Label className="text-sm font-medium flex items-center gap-1.5">
                                    <Calendar className="size-4 text-muted-foreground" />
                                    <span>Device Session Lifetime (TTL)</span>
                                </Label>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                                        <Checkbox
                                            checked={isUnlimitedTTL}
                                            onCheckedChange={(checked) => setIsUnlimitedTTL(!!checked)}
                                        />
                                        <span>Unlimited TTL (stays verified until manually unpaired)</span>
                                    </label>

                                    {!isUnlimitedTTL && (
                                        <div className="space-y-1 pt-1">
                                            <Input
                                                type="datetime-local"
                                                value={expiresAt}
                                                onChange={(e) => setExpiresAt(e.target.value)}
                                                className="text-xs h-10 font-mono"
                                                required={!isUnlimitedTTL}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DialogBody>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!name.trim() || updateMutation.isPending || (!isUnlimitedTTL && !expiresAt)}
                                className="font-semibold"
                            >
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Unassign AlertDialog */}
            {eventId && (
                <AlertDialog open={isUnassignOpen} onOpenChange={setIsUnassignOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Remove Device from Event?
                            </AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            <AlertDialogDescription>
                                This will detach the device &quot;{device.name}&quot; from this event. The physical device record will remain preserved in your global devices pool.
                            </AlertDialogDescription>
                            <p className="text-xs text-muted-foreground">
                                You can re-assign this device to this or any other event at any time.
                            </p>
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleConfirmUnassign}
                                className="bg-amber-600 text-white hover:bg-amber-700"
                            >
                                Remove from Event
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* Permanent Delete AlertDialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">
                            Delete Device Permanently?
                        </AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        <AlertDialogDescription>
                            This will permanently remove &quot;{device.name}&quot; and revoke its pairing session across all assigned events.
                        </AlertDialogDescription>
                        <p className="text-xs text-muted-foreground">
                            This action is irreversible. All cached security credentials and offline tokens will be immediately invalidated.
                        </p>
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Yes, Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
