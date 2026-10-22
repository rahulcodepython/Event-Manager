"use client";

import * as React from "react";
import { Info, Loader2, Lock, Save } from "lucide-react";

import {
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";

import { Button } from "../../ui/button";
import { AddFieldDialog } from "./add-field-dialog";
import { EditFieldDialog } from "./edit-field-dialog";
import { createNewField } from "./field-type-config";
import type { Form, FormField, FormFieldType } from "../../../schema/forms.types";
import { SortableFormFieldCard } from "./sortable-form-field-card";
import { useUnsavedChangesGuard } from "../../../hooks/use-unsaved-changes";

interface FormDesignerCanvasProps {

    form?: { name?: string } | Form;
    fields: FormField[];
    onFieldsChange: (newFields: FormField[]) => void;
    onSave: () => Promise<void>;
    isSaving: boolean;
    hasUnsavedChanges: boolean;
    isPublished?: boolean;
}

export function FormDesignerCanvas({
    form: _form,
    fields,
    onFieldsChange,
    onSave,
    isSaving,
    hasUnsavedChanges,
    isPublished,
}: FormDesignerCanvasProps) {
    useUnsavedChangesGuard(hasUnsavedChanges);

    const [editingField, setEditingField] = React.useState<FormField | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 }, // avoid hijacking clicks
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleAddField = (type: FormFieldType) => {
        const newField = createNewField(type, fields.length);
        const nextFields = [...fields, newField];
        onFieldsChange(nextFields);
        setEditingField(newField);
        setIsEditDialogOpen(true);
    };

    const handleDeleteField = (fieldId: string) => {
        const target = fields.find((f) => f.id === fieldId);
        if (target?.is_system) return;
        onFieldsChange(fields.filter((f) => f.id !== fieldId));
    };

    const handleToggleRequired = (fieldId: string, required: boolean) => {
        const nextFields = fields.map((f) => {
            if (f.id === fieldId) {
                if (f.is_system) return { ...f, required: true };
                return { ...f, required };
            }
            return f;
        });
        onFieldsChange(nextFields);
    };

    const handleSaveFieldProperties = (updatedField: FormField) => {
        const nextFields = fields.map((f) => (f.id === updatedField.id ? updatedField : f));
        onFieldsChange(nextFields);
    };

    const handleOpenEdit = (field: FormField) => {
        setEditingField(field);
        setIsEditDialogOpen(true);
    };

    // dnd-kit reorder handler — replaces all manual drag state
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = fields.findIndex((f) => f.id === active.id);
        const newIndex = fields.findIndex((f) => f.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        onFieldsChange(arrayMove(fields, oldIndex, newIndex));
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b bg-card shrink-0">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate">
                        Form Structure & Fields
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                        Drag to reorder • {fields.length} {fields.length === 1 ? "field" : "fields"} configured
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {
                        isPublished ? <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-xs font-medium text-muted-foreground border">
                            <Lock className="size-3.5 text-emerald-500" />
                            <span>Locked (Published)</span>
                        </div> : <Button
                            type="button"
                            disabled={isSaving || !hasUnsavedChanges}
                            onClick={onSave}
                            className="gap-2 text-xs font-semibold"
                        >
                            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                            <span>{isSaving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Saved"}</span>
                        </Button>
                    }
                </div>
            </div>

            {/* Scrollable Fields Canvas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {
                    isPublished ? <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                        <Lock className="size-4 shrink-0 text-emerald-600" />
                        <span>This form has been published and locked. It can be assigned to events and cannot be modified.</span>
                    </div> : <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
                        <Info className="size-3.5 shrink-0 mt-0.5 text-primary" />
                        <span>
                            Full Name, Email Address and Mobile Number are mandatory system fields. They cannot be removed or set to optional.
                        </span>
                    </div>
                }

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={isPublished ? () => { } : handleDragEnd}
                >
                    <SortableContext
                        items={fields.map((f) => f.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2.5">
                            {
                                fields.map((field, idx) => (
                                    <SortableFormFieldCard
                                        key={field.id}
                                        field={field}
                                        index={idx}
                                        totalCount={fields.length}
                                        isLocked={isPublished ?? false}
                                        onEdit={handleOpenEdit}
                                        onDelete={handleDeleteField}
                                        onToggleRequired={handleToggleRequired}
                                    />
                                ))
                            }
                        </div>
                    </SortableContext>
                </DndContext>

                {
                    !isPublished && <div className="pt-2">
                        <AddFieldDialog onAddField={handleAddField} existingTypes={fields.map((f) => f.type)} />
                    </div>
                }
            </div>

            <EditFieldDialog
                field={editingField}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onSave={handleSaveFieldProperties}
            />
        </div>
    );
}