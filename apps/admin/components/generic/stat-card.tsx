import * as React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"

export function StatCard({ title, value, hint, icon: Icon }: {
    title: string
    value: React.ReactNode
    hint?: React.ReactNode
    icon: React.ComponentType<{ className?: string }>
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
                <span className="text-2xl font-bold tracking-tight">{value}</span>
                {
                    hint && <span className="text-xs text-muted-foreground">{hint}</span>
                }
            </CardContent>
        </Card>
    )
}
