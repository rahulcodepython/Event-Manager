"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "../ui/button";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { useCreateFormMutation } from "../../query-hooks/forms.api";
import { CreateFormSchema, type CreateFormInput } from "../../schema/forms.types";

interface CreateFormDialogProps {
    trigger?: React.ReactNode;
}

export function CreateFormDialog({ trigger }: CreateFormDialogProps) {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();
    const createFormMutation = useCreateFormMutation();

    const form = useForm<CreateFormInput>({
        resolver: zodResolver(CreateFormSchema),
        defaultValues: {
            name: "",
        },
    });

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            form.reset();
        }
    };

    const onSubmit = async (values: CreateFormInput) => {
        try {
            const created = await createFormMutation.mutateAsync(values);
            setOpen(false);
            form.reset();
            router.push(`/dashboard/forms/${created.id}/design`);
        } catch {
            // Handled in mutation onError
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    trigger ? (
                        trigger as React.ReactElement
                    ) : (
                        <Button className="gap-2">
                            <PlusIcon className="size-4" />
                            <span>Create Form</span>
                        </Button>
                    )
                }
            />

            <DialogContent className="sm:max-w-lg">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Create New Form</DialogTitle>
                            <DialogDescription>
                                Give your form a name. Default mandatory fields (Name, Email, and Mobile) will be created automatically.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogBody className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium">Form Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., Annual Conference Registration"
                                                {...field}
                                                autoFocus
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                        </DialogBody>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={createFormMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createFormMutation.isPending}>
                                {createFormMutation.isPending ? "Creating..." : "Create Template"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
