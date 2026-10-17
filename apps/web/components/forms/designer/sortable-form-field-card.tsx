// components/forms/designer/sortable-form-field-card.tsx
"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { FormFieldCard } from "./form-field-card";
import type { FormField } from "../../../schema/forms.types";

interface SortableFormFieldCardProps {
    field: FormField;
    index: number;
    totalCount: number;
    isLocked: boolean;
    onEdit: (field: FormField) => void;
    onDelete: (fieldId: string) => void;
    onToggleRequired: (fieldId: string, required: boolean) => void;
}

export function SortableFormFieldCard({ field, isLocked, ...rest }: SortableFormFieldCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.id, disabled: isLocked });


    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : "auto",
    };

    return (
        <div ref={setNodeRef} style={style}>
            <FormFieldCard
                isLocked={isLocked}
                field={field}
                {...rest}
                isDragging={isDragging}
                dragHandle={
                    <div
                        title="Drag to reorder"
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="size-4" />
                    </div>
                }
            />
        </div>
    );
}