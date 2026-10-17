import * as React from "react";
import { AlertCircle, Fingerprint, KeyRound, Loader2, ScanLine, Smartphone } from "lucide-react";

import { Button } from "../../ui/button";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "../../ui/input-otp";

interface PairPinFormProps {
    pin: string;
    onPinChange: (pin: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    isSubmitting: boolean;
    actualName: string;
    errorMessage: string | null;
    isBiometricSupported: boolean;
    isBiometricPrompting: boolean;
    onBiometricLogin: () => void;
}

export function PairPinForm({
    pin,
    onPinChange,
    onSubmit,
    isSubmitting,
    actualName,
    errorMessage,
    isBiometricSupported,
    isBiometricPrompting,
    onBiometricLogin,
}: PairPinFormProps) {
    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
            {errorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="flex flex-col items-center gap-2">
                <label htmlFor="pin-input" className="text-xs font-medium text-foreground">
                    Enter 6-Digit Pairing PIN
                </label>
                <InputOTP
                    id="pin-input"
                    maxLength={6}
                    value={pin}
                    onChange={onPinChange}
                    disabled={isSubmitting}
                >
                    <InputOTPGroup>
                        <InputOTPSlot index={0} className="size-11 text-base font-semibold" />
                        <InputOTPSlot index={1} className="size-11 text-base font-semibold" />
                        <InputOTPSlot index={2} className="size-11 text-base font-semibold" />
                        <InputOTPSlot index={3} className="size-11 text-base font-semibold" />
                        <InputOTPSlot index={4} className="size-11 text-base font-semibold" />
                        <InputOTPSlot index={5} className="size-11 text-base font-semibold" />
                    </InputOTPGroup>
                </InputOTP>
                <p className="text-[11px] text-muted-foreground text-center">
                    Obtain this 5-minute PIN from your event administrator dashboard.
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <Button
                    type="submit"
                    disabled={pin.length !== 6 || isSubmitting}
                    className="w-full h-10 gap-2 text-xs font-semibold"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Verifying Terminal...</span>
                        </>
                    ) : (
                        <>
                            <KeyRound className="size-4" />
                            <span>Pair Terminal</span>
                        </>
                    )}
                </Button>

                {isBiometricSupported && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onBiometricLogin}
                        disabled={isBiometricPrompting || isSubmitting}
                        className="w-full h-10 gap-2 text-xs font-medium"
                    >
                        {isBiometricPrompting ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                <span>Scanning Biometrics...</span>
                            </>
                        ) : (
                            <>
                                <Fingerprint className="size-4 text-primary" />
                                <span>Sign In with Passkey / Face ID</span>
                            </>
                        )}
                    </Button>
                )}
            </div>

            <div className="rounded-lg bg-muted/40 p-3 border border-border/50 text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Smartphone className="size-3.5 text-primary" />
                    <span>Hardware Binding</span>
                </div>
                <p>
                    Pairing permanently authorizes this browser (<span className="font-medium text-foreground">{actualName}</span>) to operate event scanners without recurring credentials.
                </p>
            </div>
        </form>
    );
}
