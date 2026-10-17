import * as React from "react";
import { CheckCircle2, Fingerprint, RefreshCw, ScanLine, ShieldCheck, Smartphone } from "lucide-react";

import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../ui/card";
import type { Device } from "../../../schema/devices.types";

interface PairSessionCardProps {
    device: Device;
    onDisconnect: () => void;
    onEnrollBiometrics?: () => void;
    isBiometricSupported: boolean;
    isEnrollingBiometrics?: boolean;
}

export function PairSessionCard({
    device,
    onDisconnect,
    onEnrollBiometrics,
    isBiometricSupported,
    isEnrollingBiometrics,
}: PairSessionCardProps) {
    return (
        <Card className="w-full max-w-md shadow-sm border-border/80">
            <CardHeader className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-2">
                    <ShieldCheck className="size-6" />
                </div>
                <CardTitle className="text-lg font-bold text-foreground">
                    Scanner Terminal Paired
                </CardTitle>
                <CardDescription className="text-sm">
                    This browser is authorized to scan tickets and check in attendees.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Terminal Name</span>
                        <span className="font-semibold text-foreground">{device.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Hardware Device</span>
                        <span className="font-medium text-foreground">{device.actual_name || "Web Browser"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Pairing Status</span>
                        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-xs gap-1">
                            <CheckCircle2 className="size-3.5" />
                            <span>Active Session</span>
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Biometrics (Passkey)</span>
                        {device.is_biometric_enrolled ? (
                            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-xs gap-1">
                                <Fingerprint className="size-3.5" />
                                <span>Enrolled</span>
                            </Badge>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">Not Enrolled</span>
                        )}
                    </div>
                </div>

                {!device.is_biometric_enrolled && isBiometricSupported && onEnrollBiometrics && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onEnrollBiometrics}
                        disabled={isEnrollingBiometrics}
                        className="w-full gap-2 text-sm font-medium h-10"
                    >
                        <Fingerprint className="size-4 text-primary" />
                        <span>Enable Face ID / Touch ID Re-auth</span>
                    </Button>
                )}
            </CardContent>

            <CardFooter className="flex flex-col gap-2.5 border-t border-border px-6 py-4 bg-muted/20">
                <Button
                    type="button"
                    variant="default"
                    onClick={() => window.location.href = "/devices/scan"}
                    className="w-full gap-2 text-sm font-semibold h-10"
                >
                    <ScanLine className="size-4" />
                    <span>Open Scanner Terminal</span>
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    onClick={onDisconnect}
                    className="w-full text-sm text-muted-foreground hover:text-destructive h-10"
                >
                    Disconnect / Unpair Terminal
                </Button>
            </CardFooter>
        </Card>
    );
}
