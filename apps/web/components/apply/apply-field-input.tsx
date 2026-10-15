"use client";

import * as React from "react";
import { type Control } from "react-hook-form";
import { UploadCloud } from "lucide-react";

import { Checkbox } from "../ui/checkbox";
import { DatePicker } from "../ui/date-picker";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { PhoneInput } from "../ui/phone-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { TimePicker } from "../ui/time-picker";
import { ImageFieldInput } from "./image-field-input";
import type { FormField as FormFieldType } from "../../schema/forms.types";
import type { PublicApplyFormValues } from "../../schema/publicapply.types";

interface ApplyFieldInputProps {
    control: Control<PublicApplyFormValues>;
    field: FormFieldType;
    /** Needed for photo and signature fields (they upload to the form). */
    eventFormId?: string;
}

export function ApplyFieldInput({ control, field, eventFormId }: ApplyFieldInputProps) {
    const fieldKey = field.key;

    return (
        <FormField
            control={control}
            name={`data.${fieldKey}`}
            render={({ field: formField }) => (
                <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground">
                        {field.label}
                        {field.required && (
                            <span className="text-destructive font-bold ml-1">*</span>
                        )}
                    </FormLabel>

                    <FormControl>
                        <div>
                            {/* Textarea */}
                            {field.type === "textarea" && (
                                <Textarea
                                    placeholder={
                                        field.placeholder ||
                                        `Enter ${field.label.toLowerCase()}`
                                    }
                                    value={
                                        typeof formField.value === "string"
                                            ? formField.value
                                            : ""
                                    }
                                    onChange={(e) =>
                                        formField.onChange(e.target.value)
                                    }
                                    minLength={
                                        field.validation?.min_length ?? undefined
                                    }
                                    maxLength={
                                        field.validation?.max_length ?? undefined
                                    }
                                    className="min-h-24 text-sm"
                                />
                            )}

                            {/* Date Picker (ss-components/date-picker-01) */}
                            {field.type === "date" && (
                                <DatePicker
                                    value={
                                        typeof formField.value === "string"
                                            ? formField.value
                                            : ""
                                    }
                                    onChange={(val) => formField.onChange(val)}
                                    placeholder={
                                        field.placeholder || "Select date"
                                    }
                                />
                            )}

                            {/* Time Picker (ss-components/date-picker-09) */}
                            {field.type === "time" && (
                                <TimePicker
                                    value={
                                        typeof formField.value === "string"
                                            ? formField.value
                                            : ""
                                    }
                                    onChange={(val) => formField.onChange(val)}
                                    placeholder={
                                        field.placeholder || "HH:MM"
                                    }
                                />
                            )}

                            {/* Text, Email, URL, Month, Week */}
                            {(field.type === "text" ||
                                field.type === "email" ||
                                field.type === "url" ||
                                field.type === "month" ||
                                field.type === "week") && (
                                <Input
                                    type={field.type}
                                    placeholder={
                                        field.placeholder ||
                                        `Enter ${field.label.toLowerCase()}`
                                    }
                                    value={
                                        typeof formField.value === "string"
                                            ? formField.value
                                            : ""
                                    }
                                    onChange={(e) =>
                                        formField.onChange(e.target.value)
                                    }
                                    minLength={
                                        field.validation?.min_length ?? undefined
                                    }
                                    maxLength={
                                        field.validation?.max_length ?? undefined
                                    }
                                    className="h-10 text-sm"
                                />
                            )}

                            {/* Mobile Number / Phone */}
                            {field.type === "phone" && (
                                <PhoneInput
                                    placeholder={
                                        field.placeholder ||
                                        "10-digit mobile number"
                                    }
                                    value={
                                        typeof formField.value === "string"
                                            ? formField.value
                                            : ""
                                    }
                                    onChange={(val) => formField.onChange(val)}
                                />
                            )}

                            {/* Number */}
                            {field.type === "number" && (
                                <Input
                                    type="number"
                                    placeholder={
                                        field.placeholder ||
                                        `Enter ${field.label.toLowerCase()}`
                                    }
                                    value={
                                        typeof formField.value === "number" ||
                                        typeof formField.value === "string"
                                            ? formField.value
                                            : ""
                                    }
                                    min={field.validation?.min ?? undefined}
                                    max={field.validation?.max ?? undefined}
                                    onChange={(e) =>
                                        formField.onChange(
                                            e.target.value === ""
                                                ? ""
                                                : Number(e.target.value)
                                        )
                                    }
                                    className="h-10 text-sm font-mono"
                                />
                            )}

                            {/* Checkbox Group */}
                            {field.type === "checkbox" && (
                                <div className="space-y-2.5 pt-1">
                                    {(field.options || []).map((opt) => {
                                        const currentArr = Array.isArray(
                                            formField.value
                                        )
                                            ? (formField.value as string[])
                                            : [];
                                        const isChecked = currentArr.includes(
                                            opt.value
                                        );

                                        return (
                                            <label
                                                key={opt.id}
                                                className="flex items-center gap-3 text-sm text-foreground cursor-pointer"
                                            >
                                                <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            formField.onChange([
                                                                ...currentArr,
                                                                opt.value,
                                                            ]);
                                                        } else {
                                                            formField.onChange(
                                                                currentArr.filter(
                                                                    (v: string) =>
                                                                        v !==
                                                                        opt.value
                                                                )
                                                            );
                                                        }
                                                    }}
                                                />
                                                <span>{opt.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Radio Group */}
                            {field.type === "radio" && (
                                <div className="space-y-2.5 pt-1">
                                    {(field.options || []).map((opt) => (
                                        <label
                                            key={opt.id}
                                            className="flex items-center gap-3 text-sm text-foreground cursor-pointer"
                                        >
                                            <input
                                                type="radio"
                                                name={`radio-${fieldKey}`}
                                                value={opt.value}
                                                checked={
                                                    formField.value === opt.value
                                                }
                                                onChange={() =>
                                                    formField.onChange(opt.value)
                                                }
                                                className="size-4 text-primary border-input focus:ring-ring"
                                            />
                                            <span>{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Select Dropdown */}
                            {field.type === "select" && (
                                <Select
                                    value={
                                        typeof formField.value === "string"
                                            ? formField.value
                                            : ""
                                    }
                                    onValueChange={(val) =>
                                        formField.onChange(val)
                                    }
                                >
                                    <SelectTrigger className="h-10 text-sm w-full">
                                        <SelectValue
                                            placeholder={
                                                field.placeholder ||
                                                `Select ${field.label.toLowerCase()}`
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(field.options || []).map((opt) => (
                                            <SelectItem
                                                key={opt.id || opt.value}
                                                value={opt.value}
                                            >
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Switch Single Toggle */}
                            {field.type === "switch" && (
                                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                                    <span className="text-sm text-muted-foreground">
                                        {field.placeholder || "Enable option"}
                                    </span>
                                    <Switch
                                        checked={Boolean(formField.value)}
                                        onCheckedChange={(checked) =>
                                            formField.onChange(checked)
                                        }
                                    />
                                </div>
                            )}

                            {
                                (field.type === "photo" || field.type === "signature") && (
                                    eventFormId ? <ImageFieldInput
                                        eventFormId={eventFormId}
                                        field={field}
                                        value={typeof formField.value === "string" ? formField.value : ""}
                                        onChange={formField.onChange}
                                    /> : <p className="text-xs text-muted-foreground">Applicants upload this on the public form.</p>
                                )
                            }

                            {/* File Upload Field */}
                            {field.type === "file" && (
                                <div className="space-y-2">
                                    <label
                                        htmlFor={`field-${field.id}`}
                                        className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors text-center"
                                    >
                                        <UploadCloud className="size-8 text-muted-foreground mb-2" />
                                        <span className="text-sm font-medium text-foreground">
                                            {formField.value
                                                ? typeof formField.value === "string"
                                                    ? formField.value
                                                    : "File selected"
                                                : "Click to select file"}
                                        </span>
                                        <span className="text-xs text-muted-foreground mt-1">
                                            {field.validation?.accept ||
                                                "Any document format"}{" "}
                                            (Max{" "}
                                            {field.validation?.max_file_size_mb ||
                                                10}
                                            MB)
                                        </span>
                                    </label>
                                    <input
                                        id={`field-${field.id}`}
                                        type="file"
                                        accept={
                                            field.validation?.accept ||
                                            undefined
                                        }
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                formField.onChange(file.name);
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </FormControl>

                    <FormMessage className="text-xs text-destructive" />
                </FormItem>
            )}
        />
    );
}
