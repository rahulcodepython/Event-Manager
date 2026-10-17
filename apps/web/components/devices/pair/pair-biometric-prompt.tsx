import * as React from "react";
import { CheckCircle2, Fingerprint, Loader2, ShieldCheck, X } from "lucide-react";

import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import type { VerifyDeviceResponse } from "../../../schema/devices.types";

interface PairBiometricPromptProps {
    device: VerifyDeviceResponse;
    isEnrolling: boolean;
    onEnroll: () => void;
    onSkip: () => void;
}

export function PairBiometricPrompt({
    device,
    isEnrolling,
    onEnroll,
    onSkip,
}: PairBiometricPromptProps) {
    return (
        <Card className="w-full max-w-md shadow-sm border-border/80">
            <CardHeader className="text-center pb-3">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                    <Fingerprint className="size-6" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                    Enable Biometric Sign-in?
                </CardTitle>
                <CardDescription className="text-xs">
                    Terminal <span className="font-semibold text-foreground">{device.name}</span> is paired. You can register Face ID, Touch ID, or Windows Hello for instant passwordless sign-in.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
                <Button
                    type="button"
                    onClick={onEnroll}
                    disabled={isEnrolling}
                    className="w-full gap-2 text-xs font-semibold h-10"
                >
                    {isEnrolling ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Setting up Biometrics...</span>
                        </>
                    ) : (
                        <>
                            <Fingerprint className="size-4" />
                            <span>Setup Face ID / Passkey</span>
                        </>
                    )}
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    onClick={onSkip}
                    disabled={isEnrolling}
                    className="w-full text-xs text-muted-foreground"
                >
                    Skip for Now
                </Button>
            </CardContent>
        </Card>
    );
}
