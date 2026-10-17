"use client";

import * as React from "react";
import { ArrowRight, Layers, Sparkles } from "lucide-react";

import { Button } from "../../ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../ui/card";
import { SelectTemplateDialog } from "./select-template-dialog";
import type { Form } from "../../../schema/forms.types";

interface EventFormSetupCardsProps {
    onSelectTemplate: (template: Form) => void;
    onBuildScratch: () => void;
    isCreating?: boolean;
}

export function EventFormSetupCards({
    onSelectTemplate,
    onBuildScratch,
    isCreating = false,
}: EventFormSetupCardsProps) {
    const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false);

    const handleSelectTemplate = (template: Form) => {
        setTemplateDialogOpen(false);
        onSelectTemplate(template);
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
            <div className="text-center space-y-1.5 max-w-lg">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Set Up Event Registration Form
                </h2>
                <p className="text-xs text-muted-foreground">
                    This event does not have a registration form yet. Choose how you would like to begin collecting applicant registrations.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {/* Card A: Template */}
                <Card
                    onClick={() => !isCreating && setTemplateDialogOpen(true)}
                    className="relative flex flex-col justify-between p-6 cursor-pointer border-2 border-dashed hover:border-primary/60 hover:bg-muted/30 transition-all group"
                >
                    <div>
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-105 transition-transform">
                            <Layers className="size-6" />
                        </div>
                        <CardHeader className="p-0 pb-2">
                            <CardTitle className="text-base font-semibold text-foreground">
                                Choose from Template
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                                Select a pre-configured template from your global forms library. Its fields will be cloned into an independent instance for this event.
                            </CardDescription>
                        </CardHeader>
                    </div>

                    <CardContent className="p-0 pt-6">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isCreating}
                            className="w-full gap-2 text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        >
                            <span>Browse Templates</span>
                            <ArrowRight className="size-3.5" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Card B: Build from Scratch */}
                <Card
                    onClick={() => !isCreating && onBuildScratch()}
                    className="relative flex flex-col justify-between p-6 cursor-pointer border-2 border-dashed hover:border-primary/60 hover:bg-muted/30 transition-all group"
                >
                    <div>
                        <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-105 transition-transform">
                            <Sparkles className="size-6" />
                        </div>
                        <CardHeader className="p-0 pb-2">
                            <CardTitle className="text-base font-semibold text-foreground">
                                Build from Scratch
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                                Start fresh with default Full Name and Email fields. Customize fields, validations, and rules specifically for this event.
                            </CardDescription>
                        </CardHeader>
                    </div>

                    <CardContent className="p-0 pt-6">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isCreating}
                            className="w-full gap-2 text-xs font-semibold group-hover:bg-emerald-600 group-hover:text-white transition-colors"
                        >
                            <span>{isCreating ? "Creating..." : "Start from Scratch"}</span>
                            <ArrowRight className="size-3.5" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <SelectTemplateDialog
                open={templateDialogOpen}
                onOpenChange={setTemplateDialogOpen}
                onSelectTemplate={handleSelectTemplate}
                isSubmitting={isCreating}
            />
        </div>
    );
}
