"use client";

import * as React from "react";
import { Copy, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useRegeneratePINMutation } from "../../query-hooks/devices.api";
import type { Device } from "../../schema/devices.types";

interface DevicePINDisplayProps {
    device: Device;
}

export function DevicePINDisplay({ device }: DevicePINDisplayProps) {
    const regenerateMutation = useRegeneratePINMutation();

    const calculateRemaining = React.useCallback(() => {
        if (!device.pin_expires_at) return 0;
        const diff = new Date(device.pin_expires_at).getTime() - Date.now();
        return Math.max(0, Math.floor(diff / 1000));
    }, [device.pin_expires_at]);

    const [secondsLeft, setSecondsLeft] = React.useState<number>(calculateRemaining);

    React.useEffect(() => {
        setSecondsLeft(calculateRemaining());
        const interval = setInterval(() => {
            const rem = calculateRemaining();
            setSecondsLeft(rem);
            if (rem <= 0) {
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [calculateRemaining]);

    const handleCopy = (val: string) => {
        navigator.clipboard.writeText(val);
        toast.success("PIN copied to clipboard");
    };

    const handleRegenerate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await regenerateMutation.mutateAsync({ id: device.id });
    };

    const isPinActive = device.pin && secondsLeft > 0;
    const formatTimer = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center gap-2">
            {
                isPinActive ? <div className="flex items-center gap-1.5 rounded-lg border bg-muted/30 px-2.5 py-1">
                    <KeyRound className="size-3.5 text-primary" />
                    <span className="font-mono text-xs font-bold tracking-wider text-foreground">
                        {device.pin}
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleCopy(device.pin!)}
                        className="size-5 p-0 text-muted-foreground hover:text-foreground"
                        title="Copy PIN"
                    >
                        <Copy className="size-3" />
                    </Button>
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground px-1 py-0">
                        {formatTimer(secondsLeft)}
                    </Badge>
                </div> : null
            }

            {
                !isPinActive && !device.is_paired ? (
                    <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                            PIN Expired
                        </Badge>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={regenerateMutation.isPending}
                            onClick={handleRegenerate}
                            className="gap-1.5"
                        >
                            {regenerateMutation.isPending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="size-3.5" />
                            )}
                            <span>Get PIN</span>
                        </Button>
                    </div>
                ) : null}

                {!isPinActive && device.is_paired && device.is_expired ? (
                    <div className="flex items-center gap-1.5">
                        <Badge variant="destructive" className="text-[10px]">
                            Expired
                        </Badge>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={regenerateMutation.isPending}
                            onClick={handleRegenerate}
                            className="gap-1.5 text-destructive border-destructive/30"
                        >
                            {regenerateMutation.isPending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="size-3.5" />
                            )}
                            <span>Re-Verify PIN</span>
                        </Button>
                    </div>
                ) : null}

                {!isPinActive && device.is_paired && !device.is_expired ? (
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={regenerateMutation.isPending}
                        onClick={handleRegenerate}
                        className="gap-1.5 text-muted-foreground"
                        title="Generate new PIN to re-pair"
                    >
                        {regenerateMutation.isPending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="size-3.5" />
                        )}
                        <span>New PIN</span>
                    </Button>
                ) : null}
        </div>
    );
}
