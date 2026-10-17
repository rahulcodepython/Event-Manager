"use client";

import * as React from "react";
import { Edit2, Lock, Trash2 } from "lucide-react";

import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import { FIELD_TYPE_METAS } from "./field-type-config";
import { cn } from "cn";
import type { FormField } from "../../../schema/forms.types";

interface FormFieldCardProps {
    field: FormField;
    index: number;
    totalCount: number;
    dragHandle?: React.ReactNode;
    isDragging?: boolean;
    isLocked?: boolean;
    onEdit: (field: FormField) => void;
    onDelete: (fieldId: string) => void;
    onToggleRequired: (fieldId: string, required: boolean) => void;
}

export function FormFieldCard({
    field,
    dragHandle,
    isDragging,
    isLocked,
    onEdit,
    onDelete,
    onToggleRequired,
}: FormFieldCardProps) {

    const meta = FIELD_TYPE_METAS[field.type];
    const Icon = meta?.icon;

    return (
        <div
            className={cn(
                "group relative flex items-center gap-3 rounded-lg border bg-card p-3 shadow-xs transition-all select-none",
                isDragging && "opacity-40 border-dashed border-primary bg-muted/30",
                !isDragging && "hover:border-border/80 hover:shadow-sm"
            )}
        >
            {/* Drag handle on the left */}
            {
                !isLocked && (
                    <div className="flex items-center gap-0.5 shrink-0">
                        {dragHandle}
                    </div>
                )
            }

            {/* Field Type Icon */}
            {
                Icon && <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/60 text-muted-foreground">
                    <Icon className="size-4" />
                </div>
            }

            {/* Field Identity & Information */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-foreground truncate">
                        {field.label}
                    </span>
                    {
                        field.required && <span className="text-destructive font-bold text-xs" title="Required">
                            *
                        </span>
                    }
                    {
                        field.is_system && <Badge
                            variant="secondary"
                            className="text-[10px] gap-1 px-1.5 py-0 font-medium text-muted-foreground"
                        >
                            <Lock className="size-2.5" />
                            <span>System</span>
                        </Badge>
                    }
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground/80 px-1.5 py-0.2 rounded bg-muted/40 border">
                        {field.type}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono text-[10px] text-muted-foreground/70">
                        key: {field.key}
                    </span>
                    {
                        field.placeholder && <span className="truncate max-w-50">
                            • &ldquo;{field.placeholder}&rdquo;
                        </span>
                    }
                </div>
            </div>

            {/* Right Controls: Required Switch, Edit, Delete */}
            <div className="flex items-center gap-2 shrink-0">
                {/* 12. Required quick switch */}
                <div className="flex items-center gap-2 border-r pr-2 mr-1">
                    <label
                        htmlFor={`req-switch-${field.id}`}
                        className="text-[11px] text-muted-foreground cursor-pointer select-none"
                    >
                        Required
                    </label>
                    <Switch
                        id={`req-switch-${field.id}`}
                        checked={field.is_system ? true : field.required}
                        disabled={field.is_system || isLocked}
                        onCheckedChange={(checked) => onToggleRequired(field.id, checked)}
                    />
                </div>

                {/* 4. Edit Button: variant outline, size icon */}
                {
                    !isLocked && (
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onEdit(field)}
                            title="Edit Field Properties"
                        >
                            <Edit2 className="size-3.5" />
                        </Button>
                    )
                }

                {/* 4. Delete Button on the Right: variant destructive, size icon */}
                {
                    isLocked ? null : field.is_system ? <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled
                        title="System fields cannot be deleted"
                        className="text-muted-foreground/40 cursor-not-allowed"
                    >
                        <Lock className="size-3.5" />
                    </Button> : <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => onDelete(field.id)}
                        title="Delete Field"
                    >
                        <Trash2 className="size-3.5" />
                    </Button>
                }
            </div>
        </div>
    );
}