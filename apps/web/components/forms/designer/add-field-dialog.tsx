"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "../../ui/button";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../../ui/dialog";
import {
    FIELD_TYPE_METAS,
    type FieldTypeMeta,
} from "./field-type-config";
import { FORM_FIELD_TYPES, isImageField, type FormFieldType } from "../../../schema/forms.types";

interface AddFieldDialogProps {
    onAddField: (type: FormFieldType) => void;
    /** Types already on the form; photo and signature can be added once. */
    existingTypes?: FormFieldType[];
}

export function AddFieldDialog({ onAddField, existingTypes = [] }: AddFieldDialogProps) {
    const [open, setOpen] = React.useState(false);

    const handleSelectType = (type: FormFieldType) => {
        onAddField(type);
        setOpen(false);
    };

    const typesList: FieldTypeMeta[] = FORM_FIELD_TYPES.map((type) => FIELD_TYPE_METAS[type]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button
                        type="button"
                        variant="default"
                        className="w-full gap-2"
                    >
                        <Plus className="size-4" />
                        <span>Add New Field</span>
                    </Button>
                }
            />

            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">Select Field Type</DialogTitle>
                    <DialogDescription className="text-xs">
                        Choose the type of input field you want to add to your form.
                    </DialogDescription>
                </DialogHeader>

                <DialogBody>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {typesList.map((meta) => {
                            const Icon = meta.icon;
                            const taken = isImageField(meta.type) && existingTypes.includes(meta.type);
                            return (
                                <button
                                    key={meta.type}
                                    type="button"
                                    disabled={taken}
                                    title={taken ? "Already on this form" : undefined}
                                    onClick={() => handleSelectType(meta.type)}
                                    className="flex items-start gap-3 rounded-lg border bg-card/60 p-3 text-left transition-all hover:bg-muted/70 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer group disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <Icon className="size-4" />
                                    </div>
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                                            {meta.label}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                                            {meta.description}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </DialogBody>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
