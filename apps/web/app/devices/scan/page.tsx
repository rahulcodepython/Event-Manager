"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldAlert, Smartphone, SmartphoneNfc } from "lucide-react";
import { toast } from "sonner";

import { ScannerAttendeeCard } from "../../../components/scanner/scanner-attendee-card";
import { ScannerCamera } from "../../../components/scanner/scanner-camera";
import { ScannerErrorCard } from "../../../components/scanner/scanner-error-card";
import { ScannerModePicker, type ScanTarget } from "../../../components/scanner/scanner-mode-picker";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import {
    useMarkEntryMutation,
    useMarkExitMutation,
    useScanApplicantMutation,
} from "../../../query-hooks/attendance.api";
import { useMyDeviceQuery } from "../../../query-hooks/devices.api";
import { eventIdFromQR, type ScanApplicantResponse } from "../../../schema/attendance.types";

export default function StandaloneDeviceScanPage() {
    const [hasDeviceToken, setHasDeviceToken] = React.useState<boolean | null>(null);
    const [currentEventId, setCurrentEventId] = React.useState<string>("");
    const [scannedResult, setScannedResult] = React.useState<ScanApplicantResponse | null>(null);
    const [scanError, setScanError] = React.useState<string | null>(null);
    // Event entrance (null) or one sub-event.
    const [target, setTarget] = React.useState<ScanTarget>(null);

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("device_token");
            setHasDeviceToken(Boolean(token));
        }
    }, []);

    const { data: myDevice, error: deviceError } = useMyDeviceQuery(Boolean(hasDeviceToken));
    // 401: the pairing is gone; 403: the device's session expired.
    const sessionExpired = deviceError?.status === 403;
    const notPaired = hasDeviceToken === false || deviceError?.status === 401;

    const scanMutation = useScanApplicantMutation();
    const markEntryMutation = useMarkEntryMutation(currentEventId);
    const markExitMutation = useMarkExitMutation(currentEventId);

    const handleScan = async (scannedText: string) => {
        if (scanMutation.isPending) return;
        setScanError(null);

        // Cards carry a signed token; the server verifies it. The event id
        // is readable from the token and picks the endpoint.
        const qr = scannedText.trim();
        const targetEventId = eventIdFromQR(qr);
        if (!targetEventId) {
            setScanError("Not an IdentityCard badge. Please scan the QR code on the attendee's ID card.");
            return;
        }

        if (target && target.eventId !== targetEventId) {
            setScanError(`This card is for another event. The scanner is set to ${target.name}.`);
            return;
        }

        setCurrentEventId(targetEventId);

        try {
            const res = await scanMutation.mutateAsync({ eventId: targetEventId, qr, sub_event_id: target?.subEventId });
            setScannedResult(res);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to verify badge";
            setScanError(msg);
        }
    };

    const handleMarkEntry = async () => {
        if (!scannedResult || !currentEventId) return;
        try {
            const res = await markEntryMutation.mutateAsync({
                applicant_id: scannedResult.applicant.user_id,
                event_date_id: scannedResult.event_date.id,
            });

            setScannedResult((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    attendance: {
                        ...prev.attendance,
                        id: res.id,
                        status: "ready_for_exit",
                        entered_at: res.entered_at,
                        is_early: res.is_early,
                    },
                };
            });
        } catch {
            // Handled by mutation toast
        }
    };

    const handleMarkExit = async () => {
        if (!scannedResult || !currentEventId) return;
        try {
            const res = await markExitMutation.mutateAsync({
                applicant_id: scannedResult.applicant.user_id,
                event_date_id: scannedResult.event_date.id,
            });

            setScannedResult((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    attendance: {
                        ...prev.attendance,
                        id: res.id,
                        status: "already_exited",
                        exited_at: res.exited_at,
                    },
                };
            });
        } catch {
            // Handled by mutation toast
        }
    };

    const handleResetScan = () => {
        setScannedResult(null);
        setScanError(null);
    };

    // Loading state while checking token
    if (hasDeviceToken === null) {
        return (
            <div className="flex flex-col items-center justify-center p-4 min-h-screen bg-muted/20">
                <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span>Checking terminal authentication...</span>
                </div>
            </div>
        );
    }

    // Not paired, unpaired or expired: send the terminal back to pairing.
    if (notPaired || sessionExpired) {
        return (
            <div className="flex flex-col items-center justify-center p-4 min-h-screen bg-muted/20">
                <Card className="w-full max-w-md shadow-sm text-center border-amber-500/30 bg-card">
                    <CardHeader className="text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-2">
                            <Smartphone className="size-6" />
                        </div>
                        <CardTitle className="text-lg font-bold text-foreground">
                            {sessionExpired ? "Scanner Session Expired" : "Scanner Terminal Not Paired"}
                        </CardTitle>
                        <CardDescription className="text-sm">
                            {sessionExpired ? "This terminal's session has expired. Pair it again with a new PIN from the dashboard." : "This device must be paired using a 6-digit PIN before scanning attendance."}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Please pair this device with an active organization or event terminal to begin admitting attendees.
                        </p>
                    </CardContent>

                    <CardFooter>
                        <Button
                            type="button"
                            nativeButton={false}
                            render={<Link href="/devices/pair" />}
                            className="w-full gap-2 text-sm font-semibold h-10"
                        >
                            <SmartphoneNfc className="size-4" />
                            <span>Pair This Device</span>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted/20 p-4">
            <div className="w-full max-w-md flex items-center justify-between mb-3 px-1">
                <Button
                    type="button"
                    variant="ghost"
                    nativeButton={false}
                    render={<Link href="/devices/pair" />}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    <span>Terminal Session</span>
                </Button>

                {
                    myDevice && <div className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground shadow-xs">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-foreground">{myDevice.name}</span>
                    </div>
                }
            </div>

            {
                !scanError && !scannedResult && <ScannerModePicker value={target} onChange={setTarget} />
            }

            {
                scanError ? <ScannerErrorCard
                    errorMessage={scanError}
                    onScanAgain={handleResetScan}
                /> : scannedResult ? <ScannerAttendeeCard
                    data={scannedResult}
                    onMarkEntry={handleMarkEntry}
                    onMarkExit={handleMarkExit}
                    onScanAgain={handleResetScan}
                    isEntryPending={markEntryMutation.isPending}
                    isExitPending={markExitMutation.isPending}
                /> : <ScannerCamera
                    onScan={handleScan}
                    isProcessing={scanMutation.isPending}
                />
            }
        </div>
    );
}
