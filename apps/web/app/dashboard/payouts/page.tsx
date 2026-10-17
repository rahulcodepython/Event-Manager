"use client";

import { CheckCircle2, Clock, Landmark, Loader2 } from "lucide-react";

import { PageHeader } from "../../../components/generic";
import { PayoutOnboardingForm } from "../../../components/payouts/payout-onboarding-form";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { useBreadcrumbs } from "../../../hooks/use-breadcrumbs";
import { usePayoutQuery } from "../../../query-hooks/payouts.api";

export default function PayoutsPage() {
    useBreadcrumbs([
        { title: "Dashboard", url: "/dashboard" },
        { title: "Payouts" },
    ]);
    const { data, isLoading, isError, error } = usePayoutQuery();
    const account = data?.account;

    return (
        <div className="flex w-full min-w-0 max-w-3xl flex-col gap-4">
            <PageHeader
                title="Payouts"
                description="Where application fees from your registration forms are paid out."
            />
            {
                isLoading ? <div className="flex h-40 items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-primary" />
                </div> : isError ? <p className="text-sm text-destructive">{error?.message}</p> : !data?.configured ? <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                        Payments are not available on this platform yet.
                    </CardContent>
                </Card> : account ? <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle className="flex items-center gap-2">
                                <Landmark className="size-4 text-primary" />
                                {account.legal_business_name}
                            </CardTitle>
                            {
                                account.active ? <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                                    <CheckCircle2 className="size-3" />
                                    Active
                                </Badge> : <Badge variant="secondary" className="gap-1">
                                    <Clock className="size-3" />
                                    {account.status.replaceAll("_", " ")}
                                </Badge>
                            }
                        </div>
                        <CardDescription>
                            {
                                account.active ? "You can charge application fees on your registration forms." : "Razorpay is verifying your details. Application fees can be set once the account is active."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <Row label="Contact" value={account.contact_name} />
                        <Row label="Email" value={account.email} />
                        <Row label="Mobile" value={account.phone} />
                        <Row label="Bank account" value={`•••• ${account.bank_account_last4} · ${account.ifsc}`} />
                        <Row label="Razorpay account" value={account.razorpay_account_id} />
                    </CardContent>
                </Card> : <PayoutOnboardingForm />
            }
        </div>
    );
}

function Row({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex flex-col gap-0.5 rounded-md border p-3">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="break-all font-medium">{value || "—"}</span>
        </div>
    );
}
