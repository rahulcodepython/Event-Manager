"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
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
import { useUpdateFormMutation } from "../../query-hooks/forms.api";
import { UpdateFormSchema, type Form as FormType, type UpdateFormInput } from "../../schema/forms.types";

interface UpdateFormDialogProps {
    form: FormType;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export function UpdateFormDialog({
    form: formEntity,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    trigger,
}: UpdateFormDialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = isControlled ? controlledOnOpenChange : setUncontrolledOpen;

    const updateFormMutation = useUpdateFormMutation();

    const form = useForm<UpdateFormInput>({
        resolver: zodResolver(UpdateFormSchema),
        defaultValues: {
            name: formEntity.name,
        },
    });

    React.useEffect(() => {
        if (open) {
            form.reset({
                name: formEntity.name,
            });
        }
    }, [open, formEntity.name, form]);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen?.(newOpen);
        if (!newOpen) {
            form.reset({
                name: formEntity.name,
            });
        }
    };

    const onSubmit = async (values: UpdateFormInput) => {
        try {
            await updateFormMutation.mutateAsync({
                id: formEntity.id,
                name: values.name,
            });
            handleOpenChange(false);
        } catch {
            // Handled by mutation toast
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {
                trigger && <DialogTrigger render={trigger as React.ReactElement} />
            }

            <DialogContent className="sm:max-w-lg">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Update Form Details</DialogTitle>
                            <DialogDescription>
                                Update the title and general metadata for this form.
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
                                disabled={updateFormMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateFormMutation.isPending}>
                                {updateFormMutation.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
