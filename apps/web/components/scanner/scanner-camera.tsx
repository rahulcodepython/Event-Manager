"use client";

import * as React from "react";
import { Camera, Flashlight, Keyboard, Loader2, ScanLine } from "lucide-react";
import QrScanner from "qr-scanner";

import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

interface ScannerCameraProps {
    onScan: (scannedText: string) => void;
    isProcessing: boolean;
}

export function ScannerCamera({ onScan, isProcessing }: ScannerCameraProps) {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const scannerRef = React.useRef<QrScanner | null>(null);

    const [cameraError, setCameraError] = React.useState<string | null>(null);
    const [hasFlash, setHasFlash] = React.useState(false);
    const [isFlashOn, setIsFlashOn] = React.useState(false);
    const [showManualInput, setShowManualInput] = React.useState(false);
    const [manualInput, setManualInput] = React.useState("");

    React.useEffect(() => {
        let isMounted = true;

        const initScanner = async () => {
            const hasCam = await QrScanner.hasCamera();
            if (!isMounted) return;

            if (!hasCam) {
                setCameraError("No camera found on this device. Use manual input below.");
                setShowManualInput(true);
                return;
            }

            if (!videoRef.current) return;

            const qrScanner = new QrScanner(
                videoRef.current,
                (result) => {
                    if (isProcessing) return;
                    onScan(result.data);
                },
                {
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                    preferredCamera: "environment",
                    maxScansPerSecond: 4,
                }
            );

            scannerRef.current = qrScanner;

            try {
                await qrScanner.start();
                if (isMounted) {
                    const flash = await qrScanner.hasFlash();
                    setHasFlash(flash);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const msg = err instanceof Error ? err.message : "Failed to access camera";
                    setCameraError(msg);
                    setShowManualInput(true);
                }
            }
        };

        initScanner();

        return () => {
            isMounted = false;
            if (scannerRef.current) {
                scannerRef.current.stop();
                scannerRef.current.destroy();
                scannerRef.current = null;
            }
        };
    }, [onScan, isProcessing]);

    const handleToggleFlash = async () => {
        if (!scannerRef.current) return;
        try {
            await scannerRef.current.toggleFlash();
            setIsFlashOn((prev) => !prev);
        } catch {
            // Flash toggle not supported or error
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualInput.trim()) return;
        onScan(manualInput.trim());
    };

    return (
        <Card className="w-full max-w-md shadow-sm border-border/80 bg-card overflow-hidden">
            <CardHeader className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                    <ScanLine className="size-6" />
                </div>
                <CardTitle className="text-lg font-bold text-foreground">
                    Scan Attendee Badge
                </CardTitle>
                <CardDescription className="text-sm">
                    Hold the applicant QR code badge in front of the camera lens.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Camera Viewport */}
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-black shadow-inner flex items-center justify-center">
                    <video
                        ref={videoRef}
                        className="size-full object-cover"
                        playsInline
                        muted
                    />

                    {/* Scan Guide Overlay */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="size-48 rounded-2xl border-2 border-primary/70 border-dashed animate-pulse flex items-center justify-center">
                            {
                                isProcessing && <div className="flex flex-col items-center gap-2 rounded-lg bg-black/60 p-3 text-white backdrop-blur-xs">
                                    <Loader2 className="size-6 animate-spin text-primary" />
                                    <span className="text-xs font-medium">Verifying badge...</span>
                                </div>
                            }
                        </div>
                    </div>

                    {/* Camera Flash Toggle Button */}
                    {
                        hasFlash && <button
                            type="button"
                            onClick={handleToggleFlash}
                            className="absolute top-3 right-3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 backdrop-blur-xs transition-colors"
                        >
                            <Flashlight className={`size-4 ${isFlashOn ? "text-amber-400 fill-amber-400" : "text-white"}`} />
                        </button>
                    }
                </div>

                {/* Error Banner */}
                {
                    cameraError && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-xs text-destructive">
                        {cameraError}
                    </div>
                }
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t border-border px-6 py-4 bg-muted/20">
                {/* Manual Fallback Toggle */}
                <div className="flex items-center justify-between w-full">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowManualInput((prev) => !prev)}
                        className="text-sm text-muted-foreground gap-2 h-10 px-3"
                    >
                        <Keyboard className="size-4" />
                        <span>{showManualInput ? "Hide Manual Input" : "Type / Paste Code"}</span>
                    </Button>
                </div>

                {
                    showManualInput && <form onSubmit={handleManualSubmit} className="w-full space-y-2 pt-1 border-t">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Paste QR JSON or applicant ID"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                className="h-10 text-sm"
                                disabled={isProcessing}
                            />
                            <Button
                                type="submit"
                                disabled={isProcessing || !manualInput.trim()}
                                className="h-10 text-sm font-semibold px-5"
                            >
                                {
                                    isProcessing ? <Loader2 className="size-4 animate-spin" /> : "Verify"
                                }
                            </Button>
                        </div>
                    </form>
                }
            </CardFooter>
        </Card>
    );
}
