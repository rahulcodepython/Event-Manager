"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RotateCcw, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";

import { ApplyFieldInput } from "../apply/apply-field-input";
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
import { useCreateApplicantMutation } from "../../query-hooks/applicants.api";
import type { FormFieldSummary } from "../../schema/applicants.types";
import type { FormField as FormFieldType } from "../../schema/forms.types";
import {
    buildPublicApplyFormSchema,
    type FormFieldValue,
    type PublicApplyFormValues,
} from "../../schema/publicapply.types";

interface CreateApplicantDialogProps {
    eventId: string;
    formFields?: FormFieldSummary[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateApplicantDialog({
    eventId,
    formFields = [],
    open,
    onOpenChange,
}: CreateApplicantDialogProps) {
    const createMutation = useCreateApplicantMutation(eventId);

    const customFields = React.useMemo(() => {
        // Photos, signatures and files are uploaded by applicants on the public form.
        // Name, email and phone have their own inputs above.
        return formFields
            .filter((f) => f.type !== "photo" && f.type !== "signature" && f.type !== "file")
            .filter((f) => !(f.is_system && (f.key === "name" || f.key === "email" || f.key === "phone")))
            .map((f) => ({ ...f, id: f.id || f.key }) as FormFieldType);
    }, [formFields]);

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

    React.useEffect(() => {
        if (open) {
            form.reset({
                name: "",
                email: "",
                phone: "",
                data: {},
            });
        }
    }, [open, form]);

    const onSubmit = async (values: PublicApplyFormValues) => {
        try {
            const cleanData: Record<string, FormFieldValue> = {};
            for (const [k, v] of Object.entries(values.data || {})) {
                if (v !== undefined && k !== "phone" && k !== "name" && k !== "email") {
                    cleanData[k] = v;
                }
            }

            await createMutation.mutateAsync({
                name: values.name.trim(),
                email: values.email.trim().toLowerCase(),
                phone: values.phone.trim(),
                data: cleanData,
            });

            onOpenChange(false);
        } catch {
            // Handled by mutation toast
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <UserPlus className="size-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold">
                                Add Applicant Manually
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Register a new attendee for this event using the configured registration form.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                        <DialogBody className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-sm font-medium">
                                            Full Name{" "}
                                            <span className="text-destructive font-bold">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter attendee full name"
                                                className="h-10 text-sm"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-sm font-medium">
                                            Email Address{" "}
                                            <span className="text-destructive font-bold">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="Enter email address"
                                                className="h-10 text-sm"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-sm font-medium">
                                            Mobile Number{" "}
                                            <span className="text-destructive font-bold">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <PhoneInput
                                                value={field.value}
                                                onChange={field.onChange}
                                                disabled={createMutation.isPending}
                                                placeholder="10-digit mobile number"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            {
                                customFields.map((field) => <ApplyFieldInput key={field.id} field={field} control={form.control} />)
                            }
                        </DialogBody>

                        <DialogFooter className="flex items-center justify-between gap-3">
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
                                disabled={createMutation.isPending}
                                className="gap-2 font-medium"
                            >
                                <RotateCcw className="size-4" />
                                <span>Clear</span>
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="gap-2 font-semibold"
                                >
                                    {createMutation.isPending ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <UserPlus className="size-4" />
                                    )}
                                    <span>
                                        {createMutation.isPending
                                            ? "Adding Attendee..."
                                            : "Add Attendee"}
                                    </span>
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
