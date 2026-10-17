"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useEventPage } from "../../../../../components/events/event-context";
import { PageHeader } from "../../../../../components/generic";
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
import { useUpdateEventMutation } from "../../../../../query-hooks/events.api";

const EventSettingsFormSchema = z
    .object({
        name: z.string().min(1, "Event name is required"),
        start_date: z.string().min(1, "Start date is required"),
        end_date: z.string().min(1, "End date is required"),
        venue: z.string().optional(),
        organizer: z.string().optional(),
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


    const form = useForm<EventSettingsFormValues>({
        resolver: zodResolver(EventSettingsFormSchema),
        defaultValues: {
            name: event.name || "",
            start_date: event.start_date || "",
            end_date: event.end_date || "",
            venue: event.venue || "",
            organizer: event.organizer || "",
        },
    });

    React.useEffect(() => {
        form.reset();
    }, [event, form]);

    const onSubmit = (values: EventSettingsFormValues) => {
        updateEventMutation.mutate({
            id: event.id,
            name: values.name.trim(),
            start_date: values.start_date,
            end_date: values.end_date,
            venue: values.venue?.trim() || null,
            organizer: values.organizer?.trim() || null,
        });
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
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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

                            <div className="flex justify-end flex-1 w-full">
                                <Button type="submit" disabled={updateEventMutation.isPending}>
                                    <Save className="size-4" />
                                    {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </>
    );
}
