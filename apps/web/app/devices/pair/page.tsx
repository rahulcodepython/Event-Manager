"use client";

import * as React from "react";
import {
    browserSupportsWebAuthn,
    platformAuthenticatorIsAvailable,
    startAuthentication,
    startRegistration,
    type PublicKeyCredentialCreationOptionsJSON,
    type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { PairBiometricPrompt } from "../../../components/devices/pair/pair-biometric-prompt";
import { PairPinForm } from "../../../components/devices/pair/pair-pin-form";
import { PairSessionCard } from "../../../components/devices/pair/pair-session-card";
import { detectDeviceName, getDeviceFingerprint } from "../../../lib/device-fingerprint";
import {
    useMyDeviceQuery,
    useVerifyDeviceMutation,
    useWebAuthnLoginOptionsMutation,
    useWebAuthnLoginVerifyMutation,
    useWebAuthnRegisterOptionsMutation,
    useWebAuthnRegisterVerifyMutation,
} from "../../../query-hooks/devices.api";
import type { VerifyDeviceResponse } from "../../../schema/devices.types";

export default function DevicePairPage() {
    const [pin, setPin] = React.useState("");
    const [fingerprint, setFingerprint] = React.useState<string>("");
    const [actualName, setActualName] = React.useState<string>("");
    const [verifiedDevice, setVerifiedDevice] = React.useState<VerifyDeviceResponse | null>(null);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [isBiometricSupported, setIsBiometricSupported] = React.useState(false);
    const [isBiometricPrompting, setIsBiometricPrompting] = React.useState(false);
    const [isInitialized, setIsInitialized] = React.useState(false);
    const [hasStoredToken, setHasStoredToken] = React.useState(false);

    const {
        data: currentDevice,
        isLoading: isCheckingSession,
        refetch: refetchSession,
        error: sessionError,
    } = useMyDeviceQuery(isInitialized && hasStoredToken);

    const verifyMutation = useVerifyDeviceMutation();
    const regOptionsMutation = useWebAuthnRegisterOptionsMutation();
    const regVerifyMutation = useWebAuthnRegisterVerifyMutation();
    const loginOptionsMutation = useWebAuthnLoginOptionsMutation();
    const loginVerifyMutation = useWebAuthnLoginVerifyMutation();

    // Check token and detect device hardware info
    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("device_token");
            setHasStoredToken(Boolean(token));
            setIsInitialized(true);
        }
        setActualName(detectDeviceName());
        getDeviceFingerprint().then(setFingerprint);

        const checkHardware = async () => {
            try {
                if (!browserSupportsWebAuthn()) return;
                const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1500));
                const available = await Promise.race([platformAuthenticatorIsAvailable(), timeoutPromise]);
                setIsBiometricSupported(Boolean(available));
            } catch {
                setIsBiometricSupported(false);
            }
        };
        checkHardware();
    }, []);

    // Prune stale or revoked tokens if session check returns 401
    React.useEffect(() => {
        if (sessionError && sessionError.status === 401) {
            localStorage.removeItem("device_token");
            setHasStoredToken(false);
        }
    }, [sessionError]);

    // Handle standard PIN pairing
    const handlePINSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        try {
            const res = await verifyMutation.mutateAsync({
                pin,
                fingerprint: fingerprint || "fp_browser_device",
                actual_name: actualName || "Scanner Terminal",
            });

            localStorage.setItem("device_token", res.token);
            setHasStoredToken(true);

            if (isBiometricSupported && !res.is_biometric_enrolled) {
                setVerifiedDevice(res);
            } else {
                await refetchSession();
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to verify PIN";
            setErrorMessage(msg);
        }
    };

    // Handle biometric enrollment
    const handleEnrollBiometrics = async () => {
        setIsBiometricPrompting(true);
        try {
            const optsRes = await regOptionsMutation.mutateAsync({
                pin,
                actual_name: actualName || "Scanner Terminal",
            });

            const creationOpts = optsRes.options as PublicKeyCredentialCreationOptionsJSON;
            const attResp = await startRegistration({ optionsJSON: creationOpts });

            await regVerifyMutation.mutateAsync({
                session_id: optsRes.session_id,
                actual_name: actualName,
                fingerprint,
                response: attResp,
            });

            toast.success("Passkey registered successfully!");
            setVerifiedDevice(null);
            await refetchSession();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Biometric enrollment failed";
            toast.error(msg);
            setVerifiedDevice(null);
            await refetchSession();
        } finally {
            setIsBiometricPrompting(false);
        }
    };

    // Handle biometric login for enrolled devices
    const handleBiometricLogin = async () => {
        setIsBiometricPrompting(true);
        setErrorMessage(null);

        try {
            const optsRes = await loginOptionsMutation.mutateAsync({});
            const assertionOpts = optsRes.options as PublicKeyCredentialRequestOptionsJSON;
            const asResp = await startAuthentication({ optionsJSON: assertionOpts });

            const verifyRes = await loginVerifyMutation.mutateAsync({
                session_id: optsRes.session_id,
                response: asResp,
            });

            localStorage.setItem("device_token", verifyRes.token);
            setHasStoredToken(true);
            toast.success("Biometric sign-in verified!");
            await refetchSession();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Biometric login failed";
            setErrorMessage(msg);
        } finally {
            setIsBiometricPrompting(false);
        }
    };

    const handleDisconnect = () => {
        localStorage.removeItem("device_token");
        setHasStoredToken(false);
        setVerifiedDevice(null);
        setPin("");
        toast.info("Terminal disconnected");
    };

    // Loading session state: Wait until initialized and any token verification finishes
    if (!isInitialized || (hasStoredToken && isCheckingSession)) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/20">
                <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span>Checking terminal authentication...</span>
                </div>
            </div>
        );
    }

    // Active session screen
    if (currentDevice) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/20">
                <PairSessionCard
                    device={currentDevice}
                    onDisconnect={handleDisconnect}
                    isBiometricSupported={isBiometricSupported}
                    onEnrollBiometrics={!currentDevice.is_biometric_enrolled ? handleEnrollBiometrics : undefined}
                    isEnrollingBiometrics={isBiometricPrompting}
                />
            </div>
        );
    }

    // Biometric enrollment prompt (shown right after initial PIN verification)
    if (verifiedDevice) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/20">
                <PairBiometricPrompt
                    device={verifiedDevice}
                    isEnrolling={isBiometricPrompting}
                    onEnroll={handleEnrollBiometrics}
                    onSkip={() => {
                        setVerifiedDevice(null);
                        refetchSession();
                    }}
                />
            </div>
        );
    }

    // Default PIN entry screen
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-md shadow-sm border-border/80">
                <CardHeader className="text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                        <ScanLine className="size-6" />
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground">
                        Scanner Terminal Setup
                    </CardTitle>
                    <CardDescription className="text-sm">
                        Pair this device with your organization using a 6-digit PIN.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PairPinForm
                        pin={pin}
                        onPinChange={setPin}
                        onSubmit={handlePINSubmit}
                        isSubmitting={verifyMutation.isPending}
                        actualName={actualName}
                        errorMessage={errorMessage}
                        isBiometricSupported={isBiometricSupported}
                        isBiometricPrompting={isBiometricPrompting}
                        onBiometricLogin={handleBiometricLogin}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
