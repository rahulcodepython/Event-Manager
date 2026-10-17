"use client";

import * as React from "react";

import { DeviceTableRow } from "./device-table-row";
import type { EventDeviceAssignment } from "../../schema/devices.types";

interface EventDevicesTableProps {
    assignments: EventDeviceAssignment[];
    eventId: string;
}

export function EventDevicesTable({
    assignments,
    eventId,
}: EventDevicesTableProps) {
    return (
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b text-muted-foreground font-medium">
                        <tr>
                            <th className="py-2.5 px-4">Scanner Terminal</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4">Fingerprint</th>
                            <th className="py-2.5 px-4">Assigned On</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {assignments.map((assignment) => {
                            const device = assignment.device;
                            return (
                                <DeviceTableRow
                                    key={assignment.id}
                                    device={device}
                                    eventId={eventId}
                                    assignedDate={new Date(assignment.created_at).toLocaleDateString()}
                                />
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
