import * as React from "react";
import { CheckCircle2, Clock, Fingerprint, ShieldAlert } from "lucide-react";

import { Badge } from "../ui/badge";
import type { Device } from "../../schema/devices.types";

interface DeviceStatusBadgeProps {
    device: Device;
}

export function DeviceStatusBadge({ device }: DeviceStatusBadgeProps) {
    if (!device.is_paired) {
        return (
            <Badge variant="secondary" className="text-[11px] font-normal text-muted-foreground gap-1">
                <Clock className="size-3 text-muted-foreground" />
                <span>Pending Pair</span>
            </Badge>
        );
    }

    if (device.is_expired) {
        return (
            <Badge variant="destructive" className="text-[11px] font-medium gap-1">
                <ShieldAlert className="size-3" />
                <span>Expired (Re-verify)</span>
            </Badge>
        );
    }

    if (device.is_biometric_enrolled) {
        return (
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-[11px] font-medium gap-1">
                <Fingerprint className="size-3" />
                <span>Passkey Protected</span>
            </Badge>
        );
    }

    return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-[11px] font-medium gap-1">
            <CheckCircle2 className="size-3" />
            <span>Paired & Active</span>
        </Badge>
    );
}
