"use client";

import * as React from "react";

import { DeviceTableRow } from "./device-table-row";
import type { Device } from "../../schema/devices.types";

interface GlobalDevicesTableProps {
    devices: Device[];
}

export function GlobalDevicesTable({ devices }: GlobalDevicesTableProps) {
    const formatTTL = (expiresAt?: string | null) => {
        if (!expiresAt) return "Unlimited";
        try {
            const d = new Date(expiresAt);
            return isNaN(d.getTime())
                ? "Unlimited"
                : d.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                  });
        } catch {
            return "Unlimited";
        }
    };

    return (
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b text-muted-foreground font-medium">
                        <tr>
                            <th className="py-2.5 px-4">Terminal Name</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4">Fingerprint</th>
                            <th className="py-2.5 px-4">Expiration (TTL)</th>
                            <th className="py-2.5 px-4">PIN / Pair Key</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {devices.map((device) => (
                            <DeviceTableRow
                                key={device.id}
                                device={device}
                                formatTTL={formatTTL}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
