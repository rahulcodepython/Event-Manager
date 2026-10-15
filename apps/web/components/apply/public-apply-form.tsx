"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RotateCcw, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ApplyFieldInput } from "./apply-field-input";
import { Button } from "../ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "../ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { PhoneInput } from "../ui/phone-input";
import { useSubmitApplicationMutation } from "../../query-hooks/publicapply.api";
import type { FormField as FormFieldType } from "../../schema/forms.types";
import { SubEventPicker } from "./sub-event-picker";
import {
    buildPublicApplyFormSchema,
    type PublicSubEventOption,
    type FormFieldValue,
    type PublicApplyConfig,
    type PublicApplyFormValues,
    type SubmitApplicationResponse,
} from "../../schema/publicapply.types";

interface PublicApplyFormProps {
    eventFormId: string;
    config: PublicApplyConfig;
    /** Opened through a sub-event link: that sub-event is fixed. */
    fixedSubEvent?: PublicSubEventOption;
    onSuccess: (res: SubmitApplicationResponse, submittedEmail: string) => void;
}

export function PublicApplyForm({
    eventFormId,
    config,
    fixedSubEvent,
    onSuccess,
}: PublicApplyFormProps) {
    const submitMutation = useSubmitApplicationMutation();
    const [subEventIds, setSubEventIds] = React.useState<string[]>([]);
    const [subEventError, setSubEventError] = React.useState<string | null>(null);
    const { mode, required, options } = config.sub_events;
    const showPicker = !fixedSubEvent && mode !== "off" && options.length > 0;
    const customFields = (config.form?.fields as FormFieldType[]) || [];

    const schema = React.useMemo(
        () => buildPublicApplyFormSchema(customFields),
        [customFields]
    );

    const form = useForm<PublicApplyFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            data: {},
        },
    });

    const onSubmit = async (values: PublicApplyFormValues) => {
        if (showPicker && required && subEventIds.length === 0) {
            setSubEventError("Choose a sub-event.");
            return;
        }
        try {
            const parsed = schema.parse(values);
            const cleanData: Record<string, FormFieldValue> = {};
            for (const [k, v] of Object.entries(parsed.data || {})) {
                if (v !== undefined && k !== "phone" && k !== "name" && k !== "email") {
                    cleanData[k] = v;
                }
            }
            const res = await submitMutation.mutateAsync({
                eventFormId,
                name: parsed.name.trim(),
                email: parsed.email.trim().toLowerCase(),
                phone: parsed.phone.trim(),
                data: cleanData,
                sub_event_ids: fixedSubEvent ? undefined : subEventIds,
                sub_event_link: fixedSubEvent?.id,
            });
            onSuccess(res, parsed.email.trim().toLowerCase());
            toast.success("Application submitted successfully!");
        } catch {
            // Handled by mutation onError toast
        }
    };

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">
                    Attendee Information
                </CardTitle>
                <CardDescription className="text-sm">
                    Fields marked with an asterisk (
                    <span className="text-destructive font-bold">*</span>) are
                    mandatory.
                </CardDescription>
            </CardHeader>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-5">
                        {/* Mandatory Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel className="text-sm font-medium">
                                        Full Name{" "}
                                        <span className="text-destructive font-bold">
                                            *
                                        </span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter your full name"
                                            className="h-10 text-sm"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        {/* Mandatory Email */}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel className="text-sm font-medium">
                                        Email Address{" "}
                                        <span className="text-destructive font-bold">
                                            *
                                        </span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="your.email@example.com"
                                            className="h-10 text-sm"
                                            {...field}
                                        />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                        Only one registration per email is allowed for this event.
                                    </p>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        {/* Mandatory Mobile Number */}
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel className="text-sm font-medium">
                                        Mobile Number{" "}
                                        <span className="text-destructive font-bold">
                                            *
                                        </span>
                                    </FormLabel>
                                    <FormControl>
                                        <PhoneInput
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="10-digit mobile number"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        {/* Dynamic Custom Fields */}
                        {customFields.map((field) => {
                            if (
                                field.is_system &&
                                (field.key === "name" ||
                                    field.key === "email" ||
                                    field.key === "phone")
                            ) {
                                return null;
                            }

                            return (
                                <ApplyFieldInput
                                    key={field.id}
                                    field={field}
                                    eventFormId={eventFormId}
                                    control={form.control}
                                />
                            );
                        })}

                        {
                            showPicker && <SubEventPicker
                                mode={mode}
                                required={required}
                                options={options}
                                value={subEventIds}
                                error={subEventError}
                                onChange={(ids) => {
                                    setSubEventIds(ids);
                                    setSubEventError(null);
                                }}
                            />
                        }
                    </CardContent>

                    <CardFooter className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                form.reset({
                                    name: "",
                                    email: "",
                                    phone: "",
                                    data: {},
                                })
                            }
                            disabled={submitMutation.isPending}
                            className="h-10 px-4 text-sm font-medium gap-2"
                        >
                            <RotateCcw className="size-4" />
                            <span>Clear</span>
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitMutation.isPending}
                            className="h-10 px-4 text-sm font-semibold gap-2"
                        >
                            {submitMutation.isPending ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Send className="size-4" />
                            )}
                            <span>
                                {submitMutation.isPending
                                    ? "Submitting Application..."
                                    : "Submit Registration"}
                            </span>
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
