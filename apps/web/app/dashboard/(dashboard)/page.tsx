"use client";

import * as React from "react";

import { useBreadcrumbs } from "../../../hooks/use-breadcrumbs";

export default function DashboardPage() {
    useBreadcrumbs([
        {
            title: "Dashboard",
        },
    ]);

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                <div className="aspect-video rounded-md bg-muted/50" />
                <div className="aspect-video rounded-md bg-muted/50" />
                <div className="aspect-video rounded-md bg-muted/50" />
            </div>
            <div className="min-h-screen flex-1 rounded-md bg-muted/50 md:min-h-min" />
        </div>
    );
}
