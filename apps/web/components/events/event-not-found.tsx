"use client";

import * as React from "react";
import { ArrowLeft, CalendarX2 } from "lucide-react";
import Link from "next/link";

import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

export interface EventNotFoundProps {
    title?: string;
    description?: string;
    backUrl?: string;
    backLabel?: string;
}

export function EventNotFound({
    title = "Event Not Found",
    description = "The event you are looking for does not exist, has been deleted, or the link may be invalid.",
    backUrl = "/dashboard/events",
    backLabel = "Back to Events",
}: EventNotFoundProps) {
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="max-w-md text-center">
                <CardHeader className="flex flex-col items-center gap-2 pb-2">
                    <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <CalendarX2 className="size-6" />
                    </div>
                    <CardTitle className="text-xl font-semibold tracking-tight">
                        {title}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        {description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pt-4">
                    <Button render={<Link href={backUrl} />}>
                        <ArrowLeft className="mr-2 size-4" />
                        {backLabel}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
