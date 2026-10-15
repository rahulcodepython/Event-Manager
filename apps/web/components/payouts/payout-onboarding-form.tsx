"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useOnboardPayoutMutation } from "../../query-hooks/payouts.api";
import { BUSINESS_TYPES, OnboardPayoutSchema, type OnboardPayoutValues } from "../../schema/payouts.types";

type TextKey = Exclude<keyof OnboardPayoutValues, "business_type">;

const SECTIONS: { title: string, fields: { name: TextKey, label: string, placeholder?: string, optional?: boolean }[] }[] = [
    {
        title: "Business",
        fields: [
            { name: "legal_business_name", label: "Legal name", placeholder: "As on PAN" },
            { name: "pan", label: "PAN", placeholder: "ABCDE1234F" },
            { name: "contact_name", label: "Contact person" },
            { name: "email", label: "Contact email" },
            { name: "phone", label: "Contact mobile", placeholder: "10-digit mobile number" },
        ],
    },
    {
        title: "Address",
        fields: [
            { name: "street1", label: "Address line 1" },
            { name: "street2", label: "Address line 2", optional: true },
            { name: "city", label: "City" },
            { name: "state", label: "State" },
            { name: "postal_code", label: "PIN code" },
        ],
    },
    {
        title: "Bank account for settlements",
        fields: [
            { name: "beneficiary_name", label: "Account holder name" },
            { name: "account_number", label: "Account number" },
            { name: "ifsc", label: "IFSC" },
        ],
    },
];

/** Creates the organization's Razorpay Route linked account. */
export function PayoutOnboardingForm() {
    const onboard = useOnboardPayoutMutation();
    const form = useForm<OnboardPayoutValues>({
        resolver: zodResolver(OnboardPayoutSchema),
        defaultValues: {
            legal_business_name: "", business_type: "", contact_name: "", email: "", phone: "", pan: "",
            street1: "", street2: "", city: "", state: "", postal_code: "", account_number: "", ifsc: "", beneficiary_name: "",
        },
    });

    const onSubmit = form.handleSubmit((values) => {
        onboard.mutate(values);
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Set up payouts</CardTitle>
                <CardDescription>
                    Application fees are paid to this bank account through Razorpay, after Razorpay&apos;s fee and the platform fee.
                    Razorpay verifies these details before payouts start.
                </CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={onSubmit}>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="business_type"
                            render={
                                ({ field }) => <FormItem className="space-y-2">
                                    <FormLabel>Business type</FormLabel>
                                    <Select
                                        value={field.value}
                                        items={BUSINESS_TYPES.map((t) => ({ label: t.label, value: t.value }))}
                                        onValueChange={(v) => field.onChange(v ?? "")}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full sm:w-72">
                                                <SelectValue placeholder="Choose a business type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {
                                                BUSINESS_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>
                                                    {t.label}
                                                </SelectItem>)
                                            }
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            }
                        />
                        {
                            SECTIONS.map((section) => <div key={section.title} className="space-y-3">
                                <h3 className="text-sm font-semibold">{section.title}</h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {
                                        section.fields.map((f) => <FormField
                                            key={f.name}
                                            control={form.control}
                                            name={f.name}
                                            render={
                                                ({ field }) => <FormItem className="space-y-2">
                                                    <FormLabel>
                                                        {f.label}
                                                        {
                                                            f.optional && <span className="text-xs font-normal text-muted-foreground"> (optional)</span>
                                                        }
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder={f.placeholder} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            }
                                        />)
                                    }
                                </div>
                            </div>)
                        }
                    </CardContent>
                    <CardFooter className="justify-end border-t pt-4">
                        <Button type="submit" disabled={onboard.isPending} className="gap-2">
                            {
                                onboard.isPending && <Loader2 className="size-4 animate-spin" />
                            }
                            Create payout account
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
