"use client";

import * as React from "react";
import { FileText, Layers, Search } from "lucide-react";

import { Badge } from "../../ui/badge";
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
import { useFormsInfiniteQuery } from "../../../query-hooks/forms.api";
import type { Form } from "../../../schema/forms.types";

interface SelectTemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectTemplate: (template: Form) => void;
    isSubmitting?: boolean;
}

export function SelectTemplateDialog({
    open,
    onOpenChange,
    onSelectTemplate,
    isSubmitting = false,
}: SelectTemplateDialogProps) {
    const [search, setSearch] = React.useState("");
    const { data, isLoading } = useFormsInfiniteQuery({ search });

    const allTemplates = React.useMemo(() => {
        return data?.pages.flatMap((p) => p.data) || [];
    }, [data]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                        <Layers className="size-4 text-primary" />
                        <span>Choose a Form Template</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Select an existing template from your library. Its schema will be cloned into this event form as an independent instance.
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 text-sm"
                        />
                    </div>

                    {/* Templates List */}
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {isLoading ? (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                Loading templates...
                            </div>
                        ) : allTemplates.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
                                No templates found matching your search.
                            </div>
                        ) : (
                            allTemplates.map((template) => {
                                const fieldCount = template.fields?.length || 0;
                                return (
                                    <div
                                        key={template.id}
                                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                <FileText className="size-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-semibold text-foreground truncate">
                                                    {template.name}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] px-1.5 py-0 font-normal"
                                                    >
                                                        {fieldCount} {fieldCount === 1 ? "field" : "fields"}
                                                    </Badge>
                                                    <span>
                                                        Updated {new Date(template.updated_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => onSelectTemplate(template)}
                                            className="shrink-0"
                                        >
                                            Use Template
                                        </Button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogBody>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
