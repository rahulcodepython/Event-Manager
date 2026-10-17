"use client";

import * as React from "react";
import {
    Calendar,
    Clock,
    MapPin,
    RotateCcw,
    Send,
    ShieldCheck,
    UploadCloud,
    UserCheck,
} from "lucide-react";

import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "../../ui/card";
import { Checkbox } from "../../ui/checkbox";
import { DatePicker } from "../../ui/date-picker";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { PhoneInput } from "../../ui/phone-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../ui/select";
import { Switch } from "../../ui/switch";
import { Textarea } from "../../ui/textarea";
import { TimePicker } from "../../ui/time-picker";
import type { Form, FormField } from "../../../schema/forms.types";

interface FormPreviewPanelProps {
    form?: { name?: string; event?: { name?: string; start_date?: string; end_date?: string; venue?: string } } | Form;
    fields: FormField[];
}

export function FormPreviewPanel({ form, fields }: FormPreviewPanelProps) {
    const [formValues, setFormValues] = React.useState<Record<string, unknown>>({});

    const handleTextChange = (key: string, val: string) => {
        setFormValues((prev) => ({ ...prev, [key]: val }));
    };

    const handleCheckboxToggle = (key: string, optionValue: string) => {
        setFormValues((prev) => {
            const current = (prev[key] as string[]) || [];
            if (current.includes(optionValue)) {
                return { ...prev, [key]: current.filter((v) => v !== optionValue) };
            }
            return { ...prev, [key]: [...current, optionValue] };
        });
    };

    const handleSwitchChange = (key: string, checked: boolean) => {
        setFormValues((prev) => ({ ...prev, [key]: checked }));
    };

    const handleClear = () => {
        setFormValues({});
    };

    return (
        <div className="flex flex-col h-full min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/20">
            <div className="mx-auto w-full max-w-xl space-y-6">
                {/* 1. Event Details Header Card (Identical to ApplyEventHeader) */}
                <div className="rounded-xl border bg-card p-5 sm:p-6 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <Badge
                            variant="outline"
                            className="text-[11px] gap-1 px-2 py-0.5 font-medium border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
                        >
                            <ShieldCheck className="size-3 text-emerald-500" />
                            <span>Official Registration</span>
                        </Badge>
                        <Badge
                            variant="secondary"
                            className="text-[10px] uppercase tracking-wider font-semibold"
                        >
                            Open
                        </Badge>
                    </div>

                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                            {(form as any)?.event?.name || "Event Registration"}
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {form?.name || "Registration Form"}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar className="size-3.5 text-primary shrink-0" />
                            <span>
                                Starts: {(form as any)?.event?.start_date || "Upcoming Session"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="size-3.5 text-primary shrink-0" />
                            <span>
                                Ends: {(form as any)?.event?.end_date || "Multi-day schedule"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="size-3.5 text-primary shrink-0" />
                            <span>
                                Venue: {(form as any)?.event?.venue || "Main Campus / Venue"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <UserCheck className="size-3.5 text-primary shrink-0" />
                            <span>Identity Card Verified</span>
                        </div>
                    </div>
                </div>

                {/* 2. Registration Form Card (Identical to PublicApplyForm) */}
                <Card className="shadow-xs">
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

                    <CardContent className="space-y-5">
                        {fields.map((field) => {
                            const val = (formValues[field.key] as string) || "";

                            return (
                                <div key={field.id} className="space-y-2">
                                    <Label
                                        htmlFor={`preview-${field.id}`}
                                        className="text-sm font-medium text-foreground"
                                    >
                                        {field.label}{" "}
                                        {field.required && (
                                            <span className="text-destructive font-bold ml-1">
                                                *
                                            </span>
                                        )}
                                    </Label>

                                    {/* Text / Email / URL / Month / Week */}
                                    {(field.type === "text" ||
                                        field.type === "email" ||
                                        field.type === "url" ||
                                        field.type === "month" ||
                                        field.type === "week") && (
                                        <>
                                            <Input
                                                id={`preview-${field.id}`}
                                                type={field.type}
                                                value={val}
                                                onChange={(e) =>
                                                    handleTextChange(field.key, e.target.value)
                                                }
                                                placeholder={
                                                    field.placeholder ||
                                                    (field.type === "email"
                                                        ? "your.email@example.com"
                                                        : `Enter ${field.label.toLowerCase()}`)
                                                }
                                                className="h-10 text-sm"
                                            />
                                            {field.type === "email" && (
                                                <p className="text-xs text-muted-foreground">
                                                    Only one registration per email is allowed for this event.
                                                </p>
                                            )}
                                        </>
                                    )}

                                    {/* Mobile Number / Phone */}
                                    {field.type === "phone" && (
                                        <PhoneInput
                                            value={val}
                                            onChange={(phoneVal) =>
                                                handleTextChange(field.key, phoneVal)
                                            }
                                            placeholder={
                                                field.placeholder || "10-digit mobile number"
                                            }
                                        />
                                    )}

                                    {/* Number */}
                                    {field.type === "number" && (
                                        <Input
                                            id={`preview-${field.id}`}
                                            type="number"
                                            value={val}
                                            min={field.validation?.min ?? undefined}
                                            max={field.validation?.max ?? undefined}
                                            onChange={(e) =>
                                                handleTextChange(field.key, e.target.value)
                                            }
                                            placeholder={
                                                field.placeholder ||
                                                `Enter ${field.label.toLowerCase()}`
                                            }
                                            className="h-10 text-sm font-mono"
                                        />
                                    )}

                                    {/* Textarea */}
                                    {field.type === "textarea" && (
                                        <Textarea
                                            id={`preview-${field.id}`}
                                            value={val}
                                            onChange={(e) =>
                                                handleTextChange(field.key, e.target.value)
                                            }
                                            placeholder={
                                                field.placeholder ||
                                                `Enter ${field.label.toLowerCase()}`
                                            }
                                            className="min-h-24 text-sm"
                                        />
                                    )}

                                    {/* Date Picker */}
                                    {field.type === "date" && (
                                        <DatePicker
                                            value={val}
                                            onChange={(dVal) =>
                                                handleTextChange(field.key, dVal)
                                            }
                                            placeholder={
                                                field.placeholder || "Select date"
                                            }
                                        />
                                    )}

                                    {/* Time Picker */}
                                    {field.type === "time" && (
                                        <TimePicker
                                            value={val}
                                            onChange={(tVal) =>
                                                handleTextChange(field.key, tVal)
                                            }
                                            placeholder={
                                                field.placeholder || "HH:MM"
                                            }
                                        />
                                    )}

                                    {/* Select Dropdown */}
                                    {field.type === "select" && (
                                        <Select
                                            value={val}
                                            onValueChange={(sVal) => {
                                                if (sVal !== null) handleTextChange(field.key, sVal);
                                            }}
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
                                                id={`preview-${field.id}`}
                                                checked={Boolean(formValues[field.key])}
                                                onCheckedChange={(checked) =>
                                                    handleSwitchChange(field.key, checked)
                                                }
                                            />
                                        </div>
                                    )}

                                    {/* Checkbox Group */}
                                    {field.type === "checkbox" && (
                                        <div className="space-y-2.5 pt-1">
                                            {(field.options || []).map((opt) => {
                                                const currentArr = (formValues[field.key] as string[]) || [];
                                                const isChecked = currentArr.includes(opt.value);

                                                return (
                                                    <label
                                                        key={opt.id}
                                                        className="flex items-center gap-3 text-sm text-foreground cursor-pointer"
                                                    >
                                                        <Checkbox
                                                            id={`preview-chk-${opt.id}`}
                                                            checked={isChecked}
                                                            onCheckedChange={() =>
                                                                handleCheckboxToggle(field.key, opt.value)
                                                            }
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
                                                        id={`preview-rad-${opt.id}`}
                                                        name={`radio-${field.key}`}
                                                        value={opt.value}
                                                        checked={val === opt.value}
                                                        onChange={() =>
                                                            handleTextChange(field.key, opt.value)
                                                        }
                                                        className="size-4 text-primary border-input focus:ring-ring cursor-pointer"
                                                    />
                                                    <span>{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {
                                        (field.type === "photo" || field.type === "signature") && <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/20 p-4 text-left">
                                            <div className={field.type === "photo" ? "size-16 rounded-md bg-muted" : "h-10 w-28 rounded-md bg-muted"} />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground">
                                                    {field.type === "photo" ? "Upload photo" : "Upload signature"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    At least {field.validation?.min_width ?? 300}×{field.validation?.min_height ?? (field.type === "photo" ? 300 : 100)} px · JPEG, PNG or WebP up to 2 MB
                                                </span>
                                            </div>
                                        </div>
                                    }

                                    {/* File Upload Field */}
                                    {field.type === "file" && (
                                        <div className="space-y-2">
                                            <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors text-center">
                                                <UploadCloud className="size-8 text-muted-foreground mb-2" />
                                                <span className="text-sm font-medium text-foreground">
                                                    Click to select file
                                                </span>
                                                <span className="text-xs text-muted-foreground mt-1">
                                                    {field.validation?.accept || "Any document format"} (Max{" "}
                                                    {field.validation?.max_file_size_mb || 10} MB)
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>

                    {/* Footer: Matching PublicApplyForm identically */}
                    <CardFooter className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClear}
                            className="h-10 px-4 text-sm font-medium gap-2"
                        >
                            <RotateCcw className="size-4" />
                            <span>Clear</span>
                        </Button>
                        <Button
                            type="button"
                            className="h-10 px-4 text-sm font-semibold gap-2"
                            onClick={() => alert("Preview mode: Form response validated successfully.")}
                        >
                            <Send className="size-4" />
                            <span>Submit Registration</span>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
