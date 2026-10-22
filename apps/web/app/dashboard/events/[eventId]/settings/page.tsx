"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useEventPage } from "../../../../../components/events/event-context";
import { ConfirmButton, PageHeader } from "../../../../../components/generic";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "../../../../../components/ui/form";
import { Input } from "../../../../../components/ui/input";
import { APP_ROUTES } from "../../../../../lib/constants";
import { useDeleteEventMutation, useUpdateEventMutation } from "../../../../../query-hooks/events.api";

// IANA names the browser knows, for the timezone picker.
const TIMEZONES: string[] = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

/** Any IANA name the browser accepts, aliases included (Asia/Kolkata and Asia/Calcutta). */
function isTimezone(tz: string) {
    try {
        new Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

const EventSettingsFormSchema = z
    .object({
        name: z.string().min(1, "Event name is required"),
        start_date: z.string().min(1, "Start date is required"),
        end_date: z.string().min(1, "End date is required"),
        venue: z.string().optional(),
        organizer: z.string().optional(),
        timezone: z
            .string()
            .min(1, "Timezone is required")
            .refine(isTimezone, "Pick a timezone from the list"),
    })
    .refine(
        (data) => !data.start_date || !data.end_date || data.end_date >= data.start_date,
        {
            message: "End date must be greater than or equal to start date",
            path: ["end_date"],
        }
    );

type EventSettingsFormValues = z.infer<typeof EventSettingsFormSchema>;

export default function SettingsPage() {
    const { event } = useEventPage("Settings");
    const updateEventMutation = useUpdateEventMutation();
    const deleteEventMutation = useDeleteEventMutation();
    const router = useRouter();
    // The credit ended: the server refuses every change.
    const readOnly = Boolean(event.credit?.is_expired);

    const form = useForm<EventSettingsFormValues>({
        resolver: zodResolver(EventSettingsFormSchema),
        defaultValues: {
            name: event.name || "",
            start_date: event.start_date || "",
            end_date: event.end_date || "",
            venue: event.venue || "",
            organizer: event.organizer || "",
            timezone: event.timezone || "",
        },
    });

    // Show the saved event, not the values the page first loaded with.
    React.useEffect(() => {
        form.reset({
            name: event.name || "",
            start_date: event.start_date || "",
            end_date: event.end_date || "",
            venue: event.venue || "",
            organizer: event.organizer || "",
            timezone: event.timezone || "",
        });
    }, [event, form]);

    const onSubmit = (values: EventSettingsFormValues) => {
        updateEventMutation.mutate({
            id: event.id,
            name: values.name.trim(),
            start_date: values.start_date,
            end_date: values.end_date,
            venue: values.venue?.trim() || null,
            organizer: values.organizer?.trim() || null,
            timezone: values.timezone,
        });
    };

    const deleteEvent = async () => {
        await deleteEventMutation.mutateAsync(event.id);
        router.push(APP_ROUTES.EVENTS);
    };

    return (
        <>
            <PageHeader
                title="Settings"
                description="Update basic event information, schedule dates, and venue configurations."
            />

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">General Information</CardTitle>
                    <CardDescription className="text-xs">
                        Details displayed on badge templates and participant check-in forms.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <fieldset disabled={readOnly} className="flex flex-col gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Event Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. Annual Tech Conference 2026"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    }
                                />

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="start_date"
                                        render={
                                            ({ field }) => <FormItem>
                                                <FormLabel>Start Date</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        }
                                    />
                                    <FormField
                                        control={form.control}
                                        name="end_date"
                                        render={
                                            ({ field }) => <FormItem>
                                                <FormLabel>End Date</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        }
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="venue"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Venue</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. Moscone Center, San Francisco"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    }
                                />

                                <FormField
                                    control={form.control}
                                    name="organizer"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Organizer</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. IEEE Student Branch"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    }
                                />

                                <FormField
                                    control={form.control}
                                    name="timezone"
                                    render={
                                        ({ field }) => <FormItem>
                                            <FormLabel>Timezone</FormLabel>
                                            <FormControl>
                                                <Input list="event-timezones" placeholder="e.g. Asia/Kolkata" autoComplete="off" {...field} />
                                            </FormControl>
                                            <datalist id="event-timezones">
                                                {
                                                    TIMEZONES.map((tz) => <option key={tz} value={tz} />)
                                                }
                                            </datalist>
                                            <p className="text-xs text-muted-foreground">Session hours, check-in punctuality and the end of each day follow this timezone.</p>
                                            <FormMessage />
                                        </FormItem>
                                    }
                                />

                                <div className="flex justify-end flex-1 w-full">
                                    <Button type="submit" disabled={readOnly || updateEventMutation.isPending}>
                                        <Save className="size-4" />
                                        {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            </fieldset>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card className="border-destructive/40">
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-destructive">Delete event</CardTitle>
                    <CardDescription className="text-xs">
                        Removes the event with its form, applicants, attendance, device assignments and website. Its credit can then run another event.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end">
                    <ConfirmButton
                        trigger={
                            <Button variant="destructive" className="gap-2">
                                <Trash2 className="size-4" />
                                Delete event
                            </Button>
                        }
                        title={`Delete "${event.name}"?`}
                        description="This permanently deletes the event and everything in it. It cannot be undone."
                        confirmLabel="Delete event"
                        confirmText={event.name}
                        destructive
                        onConfirm={deleteEvent}
                    />
                </CardContent>
            </Card>
        </>
    );
}
