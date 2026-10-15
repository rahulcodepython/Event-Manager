"use client";

import * as React from "react";
import { Download, Loader2, QrCode, SendIcon } from "lucide-react";
import QRCode from "qrcode";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { downloadCard, useApplicantQRQuery, useResendCardMutation } from "../../query-hooks/cards.api";
import type { ApplicantItem } from "../../schema/applicants.types";

interface ApplicantQrDialogProps {
    applicant: ApplicantItem;
    eventId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Cards are published, so the card can be emailed again. */
    canResend: boolean;
}

const CARD_STATUS: Record<ApplicantItem["card_status"], { label: string, variant: "secondary" | "outline" | "default" | "destructive" }> = {
    pending: { label: "Not sent", variant: "outline" },
    queued: { label: "Sending", variant: "secondary" },
    sent: { label: "Sent", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
};

export function ApplicantQrDialog({
    applicant,
    eventId,
    open,
    onOpenChange,
    canResend,
}: ApplicantQrDialogProps) {
    const { data: qr } = useApplicantQRQuery(eventId, applicant.user_id, open);
    const [qrDataUrl, setQrDataUrl] = React.useState("");
    const [downloading, setDownloading] = React.useState(false);
    const resend = useResendCardMutation(eventId);

    React.useEffect(() => {
        if (!qr) return;
        let cancelled = false;
        QRCode.toDataURL(qr, { width: 320, margin: 2, errorCorrectionLevel: "M" })
            .then((url) => {
                if (!cancelled) setQrDataUrl(url);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [qr]);

    const handleDownload = async () => {
        setDownloading(true);
        await downloadCard(eventId, applicant.user_id);
        setDownloading(false);
    };

    const status = CARD_STATUS[applicant.card_status];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <QrCode className="size-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold">
                                ID Card
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                The QR code is signed by the server, so it cannot be forged.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    <div className="flex flex-col items-center justify-center">
                        <div className="flex size-64 items-center justify-center rounded-xl border border-border bg-white p-3 shadow-xs">
                            {
                                qrDataUrl ? <img
                                    src={qrDataUrl}
                                    alt={`QR Code for ${applicant.name}`}
                                    className="size-full object-contain"
                                /> : <Loader2 className="size-5 animate-spin text-muted-foreground" />
                            }
                        </div>
                    </div>

                    <div className="w-full rounded-lg border bg-muted/20 p-3 text-xs space-y-1.5">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Attendee</span>
                            <span className="font-semibold text-foreground">{applicant.name}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Applicant ID</span>
                            <span className="font-mono text-foreground">{applicant.user_id}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Email</span>
                            <span className="text-foreground">{applicant.email}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span>Card email</span>
                            <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        {
                            applicant.card_status === "failed" && applicant.card_error && <p className="text-destructive break-words">
                                {applicant.card_error}
                            </p>
                        }
                    </div>
                </DialogBody>

                <DialogFooter>
                    {
                        canResend && <Button
                            type="button"
                            variant="outline"
                            disabled={resend.isPending || applicant.card_status === "queued"}
                            onClick={() => resend.mutate(applicant.user_id)}
                        >
                            <SendIcon className="size-4" />
                            <span>Resend card</span>
                        </Button>
                    }
                    <Button type="button" onClick={handleDownload} disabled={downloading}>
                        {
                            downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />
                        }
                        <span>Download card (PDF)</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
