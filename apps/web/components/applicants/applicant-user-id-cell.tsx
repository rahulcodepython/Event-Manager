"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../ui/button";

interface ApplicantUserIdCellProps {
    userId: string;
}

export function ApplicantUserIdCell({ userId }: ApplicantUserIdCellProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(userId);
            setCopied(true);
            toast.success("User ID copied");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy User ID");
        }
    };

    return (
        <div className="flex items-center gap-1.5 font-mono text-xs max-w-32.2">
            <span
                onClick={handleCopy}
                className="font-semibold text-foreground bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors px-1.5 py-0.5 rounded border truncate text-[11px] max-w-23.75 inline-block cursor-pointer"
                title={`${userId} (Click to copy)`}
            >
                {userId}
            </span>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
                title="Copy User ID"
            >
                {copied ? (
                    <Check className="size-3 text-emerald-500" />
                ) : (
                    <Copy className="size-3" />
                )}
            </Button>
        </div>
    );
}
