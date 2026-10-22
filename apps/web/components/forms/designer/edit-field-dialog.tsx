"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "../../ui/button";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { FIELD_TYPE_METAS } from "./field-type-config";
import { FileFieldSettings } from "./file-field-settings";
import type { FieldOption, FormField } from "../../../schema/forms.types";

interface EditFieldDialogProps {
    field: FormField | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (updatedField: FormField) => void;
}

function EditFieldDialogBody({
    field,
    onOpenChange,
    onSave,
}: {
    field: FormField;
    onOpenChange: (open: boolean) => void;
    onSave: (updatedField: FormField) => void;
}) {
    const [label, setLabel] = React.useState(field.label);
    const [key, setKey] = React.useState(field.key);
    const [placeholder, setPlaceholder] = React.useState(field.placeholder || "");
    const [required, setRequired] = React.useState(field.required);
    const isOptionsType =
        field.type === "checkbox" ||
        field.type === "radio" ||
        field.type === "select";
    const isNumberType = field.type === "number";
    const isLengthType =
        field.type === "text" ||
        field.type === "textarea" ||
        field.type === "number" ||
        field.type === "phone";
    const isFileType = field.type === "file";
    const isImageType = field.type === "photo" || field.type === "signature";
    const defaultMin = field.type === "signature" ? { w: 300, h: 100 } : { w: 300, h: 300 };
    const [minWidth, setMinWidth] = React.useState(String(field.validation?.min_width ?? defaultMin.w));
    const [minHeight, setMinHeight] = React.useState(String(field.validation?.min_height ?? defaultMin.h));

    const [options, setOptions] = React.useState<FieldOption[]>(
        field.options && field.options.length > 0
            ? [...field.options]
            : isOptionsType
              ? [
                    { id: "opt_1", label: "Option 1", value: "option_1" },
                    { id: "opt_2", label: "Option 2", value: "option_2" },
                ]
              : []
    );
    const [minVal, setMinVal] = React.useState<string>(
        field.validation?.min !== undefined && field.validation?.min !== null
            ? String(field.validation.min)
            : ""
    );
    const [maxVal, setMaxVal] = React.useState<string>(
        field.validation?.max !== undefined && field.validation?.max !== null
            ? String(field.validation.max)
            : ""
    );
    const [minLengthVal, setMinLengthVal] = React.useState<string>(
        field.validation?.min_length !== undefined &&
            field.validation?.min_length !== null
            ? String(field.validation.min_length)
            : ""
    );
    const [maxLengthVal, setMaxLengthVal] = React.useState<string>(
        field.validation?.max_length !== undefined &&
            field.validation?.max_length !== null
            ? String(field.validation.max_length)
            : ""
    );
    const [acceptVal, setAcceptVal] = React.useState<string>(
        field.validation?.accept || ""
    );
    const [maxFileSizeMB, setMaxFileSizeMB] = React.useState<number>(
        field.validation?.max_file_size_mb || 10
    );
    const [allowMultiple, setAllowMultiple] = React.useState<boolean>(
        Boolean(field.validation?.multiple)
    );

    const meta = FIELD_TYPE_METAS[field.type];

    const handleAddOption = () => {
        const nextIdx = options.length + 1;
        setOptions([
            ...options,
            {
                id: `opt_${crypto.randomUUID().slice(0, 6)}`,
                label: `Option ${nextIdx}`,
                value: `option_${nextIdx}`,
            },
        ]);
    };

    const handleOptionChange = (
        index: number,
        keyToUpdate: "label" | "value",
        val: string
    ) => {
        const updated = [...options];
        const prev = updated[index];
        if (keyToUpdate === "label") {
            const prevSlug = prev.label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "");
            const currentSlug = prev.value;
            const newSlug = val
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "");
            updated[index] = {
                ...prev,
                label: val,
                value:
                    currentSlug === prevSlug || currentSlug.startsWith("option_")
                        ? newSlug || `option_${index + 1}`
                        : currentSlug,
            };
        } else {
            updated[index] = {
                ...prev,
                value: val.toLowerCase().replace(/[^a-z0-9_-]+/g, "_"),
            };
        }
        setOptions(updated);
    };

    const handleRemoveOption = (index: number) => {
        setOptions(options.filter((_, idx) => idx !== index));
    };

    const handleSave = () => {
        const updated: FormField = {
            ...field,
            label: label.trim() || field.label,
            key: key.trim() || field.key,
            placeholder: placeholder.trim(),
            required: field.is_system ? true : required,
            options: isOptionsType ? options : [],
            validation: {
                min: isNumberType && minVal !== "" ? parseFloat(minVal) : null,
                max: isNumberType && maxVal !== "" ? parseFloat(maxVal) : null,
                min_length:
                    isLengthType && minLengthVal !== ""
                        ? parseInt(minLengthVal, 10)
                        : null,
                max_length:
                    isLengthType && maxLengthVal !== ""
                        ? parseInt(maxLengthVal, 10)
                        : null,
                accept: isFileType && acceptVal !== "" ? acceptVal.trim() : null,
                max_file_size_mb: isFileType ? maxFileSizeMB : null,
                multiple: isFileType ? allowMultiple : null,
                min_width: isImageType ? Math.max(1, parseInt(minWidth, 10) || defaultMin.w) : null,
                min_height: isImageType ? Math.max(1, parseInt(minHeight, 10) || defaultMin.h) : null,
            },
        };

        onSave(updated);
        onOpenChange(false);
    };

    return (
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                    <span>Edit Field Properties</span>
                    <span className="text-xs font-normal text-muted-foreground uppercase px-2 py-0.5 rounded border bg-muted/40">
                        {meta?.label ?? field.type}
                    </span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                    Configure how this field appears and validates data.
                </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4">
                {/* Field Label */}
                <div className="space-y-1.5">
                    <Label htmlFor="field-label" className="text-sm font-medium">
                        Field Label
                    </Label>
                    <Input
                        id="field-label"
                        value={label}
                        disabled={field.is_system}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="e.g., Company Name"
                        className="h-10 text-sm"
                    />
                </div>

                {/* Field Key */}
                <div className="space-y-1.5">
                    <Label htmlFor="field-key" className="text-sm font-medium">
                        Field Key
                    </Label>
                    <Input
                        id="field-key"
                        value={key}
                        disabled={true}
                        onChange={(e) =>
                            setKey(
                                e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9_]/g, "_")
                            )
                        }
                        placeholder="e.g., company_name"
                        className="h-10 text-sm font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                        Keys are set when a field is created and cannot be changed: saved answers use them.
                    </p>
                </div>

                {/* Placeholder (if applicable) */}
                {field.type !== "checkbox" &&
                    field.type !== "radio" &&
                    field.type !== "switch" && (
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="field-placeholder"
                                className="text-sm font-medium"
                            >
                                Placeholder Text
                            </Label>
                            <Input
                                id="field-placeholder"
                                value={placeholder}
                                onChange={(e) => setPlaceholder(e.target.value)}
                                placeholder="e.g., Enter your response..."
                                className="h-10 text-sm"
                            />
                        </div>
                    )}

                {/* Required Toggle */}
                <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                    <div className="space-y-0.5">
                        <Label
                            htmlFor="field-required"
                            className="text-sm font-medium cursor-pointer"
                        >
                            Mandatory / Required Field
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {field.is_system
                                ? "System fields (Name, Email, and Mobile) are always mandatory."
                                : "User must provide an answer to submit the form."}
                        </p>
                    </div>
                    <Switch
                        id="field-required"
                        checked={field.is_system ? true : required}
                        disabled={field.is_system}
                        onCheckedChange={setRequired}
                    />
                </div>

                {/* Options Editor for Checkbox, Radio & Dropdown Select */}
                {isOptionsType && (
                    <div className="space-y-3 rounded-lg border p-3 bg-muted/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">
                                    Options List
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Define the choices available for this field.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddOption}
                                className="gap-1.5"
                            >
                                <Plus className="size-4" />
                                <span>Add Option</span>
                            </Button>
                        </div>

                        <div className="space-y-2 pt-1">
                            {options.map((opt, idx) => (
                                <div
                                    key={opt.id || idx}
                                    className="flex items-center gap-2"
                                >
                                    <Input
                                        value={opt.label}
                                        onChange={(e) =>
                                            handleOptionChange(
                                                idx,
                                                "label",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Option label"
                                        className="h-10 text-sm flex-1"
                                    />
                                    <Input
                                        value={opt.value}
                                        onChange={(e) =>
                                            handleOptionChange(
                                                idx,
                                                "value",
                                                e.target.value
                                            )
                                        }
                                        placeholder="value"
                                        className="h-10 text-sm w-32 font-mono"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={options.length <= 1}
                                        onClick={() => handleRemoveOption(idx)}
                                        className="text-destructive hover:bg-destructive/10 shrink-0"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Numeric Min/Max Value Limits */}
                {isNumberType && (
                    <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 bg-muted/10">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Minimum Value</Label>
                            <Input
                                type="number"
                                value={minVal}
                                onChange={(e) => setMinVal(e.target.value)}
                                placeholder="No limit"
                                className="h-10 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Maximum Value</Label>
                            <Input
                                type="number"
                                value={maxVal}
                                onChange={(e) => setMaxVal(e.target.value)}
                                placeholder="No limit"
                                className="h-10 text-sm"
                            />
                        </div>
                    </div>
                )}

                {/* Min / Max Length for Text, Textarea, Number */}
                {isLengthType && (
                    <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 bg-muted/10">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">
                                {field.type === "number"
                                    ? "Min Digits / Length"
                                    : "Minimum Characters"}
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                value={minLengthVal}
                                onChange={(e) => setMinLengthVal(e.target.value)}
                                placeholder="e.g., 2"
                                className="h-10 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">
                                {field.type === "number"
                                    ? "Max Digits / Length"
                                    : "Maximum Characters"}
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                value={maxLengthVal}
                                onChange={(e) => setMaxLengthVal(e.target.value)}
                                placeholder="e.g., 100"
                                className="h-10 text-sm"
                            />
                        </div>
                    </div>
                )}

                {
                    isImageType && <div className="space-y-2">
                        <Label className="text-xs font-medium">Minimum image size (pixels)</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                type="number"
                                min="1"
                                value={minWidth}
                                onChange={(e) => setMinWidth(e.target.value)}
                                aria-label="Minimum width"
                                className="h-10 text-sm"
                            />
                            <Input
                                type="number"
                                min="1"
                                value={minHeight}
                                onChange={(e) => setMinHeight(e.target.value)}
                                aria-label="Minimum height"
                                className="h-10 text-sm"
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Width × height. JPEG, PNG or WebP up to 2 MB.
                            {field.type === "photo" ? " Applicants crop the photo to a square." : ""}
                        </p>
                    </div>
                }

                {/* File Upload Accept & Max File Size Range */}
                {isFileType && (
                    <FileFieldSettings
                        acceptValue={acceptVal}
                        onAcceptChange={setAcceptVal}
                        maxFileSizeMB={maxFileSizeMB}
                        onMaxFileSizeChange={setMaxFileSizeMB}
                        allowMultiple={allowMultiple}
                        onAllowMultipleChange={setAllowMultiple}
                    />
                )}
            </DialogBody>

            <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                >
                    Cancel
                </Button>
                <Button type="button" onClick={handleSave}>
                    Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

export function EditFieldDialog({
    field,
    open,
    onOpenChange,
    onSave,
}: EditFieldDialogProps) {
    if (!field) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <EditFieldDialogBody
                key={field.id}
                field={field}
                onOpenChange={onOpenChange}
                onSave={onSave}
            />
        </Dialog>
    );
}
