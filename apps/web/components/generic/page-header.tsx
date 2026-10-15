import * as React from "react"

export interface PageHeaderProps {
    title: React.ReactNode
    description?: React.ReactNode
    /** Rendered next to the title, e.g. a status badge. */
    badge?: React.ReactNode
    /** Rendered on the right side, e.g. action buttons or filters. */
    actions?: React.ReactNode
}

export function PageHeader({
    title,
    description,
    badge,
    actions,
}: PageHeaderProps) {
    return (
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                        {title}
                    </h1>
                    {badge}
                </div>
                {description && (
                    <div className="text-xs text-muted-foreground">
                        {description}
                    </div>
                )}
            </div>
            {actions && (
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    )
}
