import * as React from "react";
import { cn } from "../../lib/utils";

function Card({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card"
            className={cn(
                "group/card flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm",
                className
            )}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-header"
            className={cn(
                "flex flex-col gap-1.5 border-b border-border px-6 py-4",
                className
            )}
            {...props}
        />
    );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-title"
            className={cn("font-heading text-lg font-semibold tracking-tight text-foreground", className)}
            {...props}
        />
    );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-description"
            className={cn("text-sm text-muted-foreground leading-relaxed", className)}
            {...props}
        />
    );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-action"
            className={cn("ml-auto flex items-center gap-2", className)}
            {...props}
        />
    );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-content"
            className={cn("flex-1 p-6", className)}
            {...props}
        />
    );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-footer"
            className={cn(
                "flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20",
                className
            )}
            {...props}
        />
    );
}

export {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardAction,
    CardDescription,
    CardContent,
};
