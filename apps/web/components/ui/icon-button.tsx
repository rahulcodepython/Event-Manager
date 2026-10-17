"use client";

import * as React from "react";
import { Button, type buttonVariants } from "./button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

export interface IconButtonProps
    extends React.ComponentProps<typeof Button> {
    icon?: React.ReactNode;
    iconPosition?: "left" | "right";
}

export function IconButton({
    icon,
    iconPosition = "left",
    children,
    className,
    ...props
}: IconButtonProps) {
    return (
        <Button
            className={cn(
                // When there is an icon alongside text content, align icon nicely
                children && icon ? "" : undefined,
                className
            )}
            {...props}
        >
            {icon && iconPosition === "left" ? (
                <span className="shrink-0 inline-flex items-center justify-center pointer-events-none">
                    {icon}
                </span>
            ) : null}
            {children}
            {icon && iconPosition === "right" ? (
                <span className="shrink-0 inline-flex items-center justify-center pointer-events-none">
                    {icon}
                </span>
            ) : null}
        </Button>
    );
}

export { IconButton as ButtonWithIcon };
