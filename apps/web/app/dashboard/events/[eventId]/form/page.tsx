"use client";

import * as React from "react";
import { Loader2, Lock } from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogBody,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../../../../../components/ui/alert-dialog";
import { ApplicationFeeDialog } from "../../../../../components/events/form/application-fee-dialog";
import { EventFormHeader } from "../../../../../components/events/form/event-form-header";
import { EventFormSettingsDialog } from "../../../../../components/events/form/event-form-settings-dialog";
import { EventFormSetupCards } from "../../../../../components/events/form/event-form-setup-cards";
import { QrSharingDialog } from "../../../../../components/events/form/qr-sharing-dialog";
import { FormDesignerCanvas } from "../../../../../components/forms/designer/form-designer-canvas";
import { FormPreviewPanel } from "../../../../../components/forms/preview/form-preview-panel";
import { useEventPage } from "../../../../../components/events/event-context";
import {
    useCreateEventFormMutation,
    useDeleteEventFormMutation,
    useEventFormQuery,
    useLockEventFormMutation,
    useUpdateEventFormMutation,
} from "../../../../../query-hooks/eventform.api";
import type { Form, FormField } from "../../../../../schema/forms.types";

export default function EventFormPage() {
    const { event, eventId } = useEventPage("Registration Form");
    const { data: eventForm, isLoading } = useEventFormQuery(eventId);

    const createMutation = useCreateEventFormMutation();
    const updateMutation = useUpdateEventFormMutation();
    const lockMutation = useLockEventFormMutation();
    const deleteMutation = useDeleteEventFormMutation();

    // Local edits to the form fields; null means "no edits, show the saved fields"
    const [draftFields, setDraftFields] = React.useState<FormField[] | null>(null);
    const designerFields = draftFields ?? eventForm?.fields ?? [];
    const [isSharingOpen, setIsSharingOpen] = React.useState(false);
    const [isConfigOpen, setIsConfigOpen] = React.useState(false);
    const [isFeeOpen, setIsFeeOpen] = React.useState(false);
    const [isLockPrompt, setIsLockPrompt] = React.useState(false);
    const [isLockConfirmOpen, setIsLockConfirmOpen] = React.useState(false);
    const [hasSavedSettings, setHasSavedSettings] = React.useState(false);

    const hasUnsavedChanges =
        Boolean(eventForm) &&
        !eventForm?.is_locked &&
        draftFields !== null &&
        JSON.stringify(draftFields) !== JSON.stringify(eventForm?.fields);

    // Whether capacity and deadline are configured and still valid. Called
    // from the lock handler, so reading the clock here is fine.
    const isConfigSet = () => {
        if (!eventForm) return false;
        if (!eventForm.expires_at) return false;
        const expiryTime = new Date(eventForm.expires_at).getTime();
        if (isNaN(expiryTime) || expiryTime <= Date.now()) return false;
        if (
            eventForm.max_applicants === 0 ||
            (eventForm.max_applicants !== -1 && eventForm.max_applicants < 1)
        ) {
            return false;
        }
        // If settings have never been explicitly updated or confirmed
        // (e.g. newly created default unconfigured form with max_applicants: -1 and created_at === updated_at)
        if (
            !hasSavedSettings &&
            eventForm.max_applicants === -1 &&
            eventForm.created_at === eventForm.updated_at
        ) {
            return false;
        }
        return true;
    };

    // Sensible default expiration (event end date or 30 days in future)
    const getDefaultExpiresAt = React.useCallback(() => {
        if (event.end_date) {
            const parsed = new Date(event.end_date);
            if (!isNaN(parsed.getTime())) {
                parsed.setHours(23, 59, 59, 999);
                return parsed.toISOString();
            }
        }
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 30);
        return fallback.toISOString();
    }, [event.end_date]);

    // 1. Initial State: Setup handlers
    const handleSelectTemplate = (template: Form) => {
        createMutation.mutate({
            eventId,
            source: "template",
            template_id: template.id,
            name: `${event.name} - ${template.name}`,
            max_applicants: -1,
            expires_at: getDefaultExpiresAt(),
        });
    };

    const handleBuildScratch = () => {
        createMutation.mutate({
            eventId,
            source: "scratch",
            name: `${event.name} Registration Form`,
            max_applicants: -1,
            expires_at: getDefaultExpiresAt(),
        });
    };

    // 2. Active Form handlers
    const handleSaveDesignerFields = async () => {
        if (!eventForm || eventForm.is_locked) return;
        await updateMutation.mutateAsync({
            eventId,
            fields: designerFields,
        });
        setDraftFields(null);
    };

    const handleSaveSettings = async (settings: {
        max_applicants: number;
        expires_at: string;
    }) => {
        if (!eventForm || eventForm.is_locked) return;
        await updateMutation.mutateAsync({
            eventId,
            max_applicants: settings.max_applicants,
            expires_at: settings.expires_at,
        });
        setHasSavedSettings(true);
    };

    const handleLockClick = () => {
        if (!isConfigSet()) {
            setIsLockPrompt(true);
            setIsConfigOpen(true);
        } else {
            setIsLockConfirmOpen(true);
        }
    };

    const handleConfirmLock = () => {
        lockMutation.mutate({ eventId });
        setIsLockConfirmOpen(false);
    };

    const handleDeleteForm = () => {
        deleteMutation.mutate({ eventId });
    };

    if (isLoading) {
        return (
            <div className="flex h-96 w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span>Loading registration form...</span>
                </div>
            </div>
        );
    }

    // A. Dual Setup Cards when no form exists
    if (!eventForm) {
        return (
            <EventFormSetupCards
                onSelectTemplate={handleSelectTemplate}
                onBuildScratch={handleBuildScratch}
                isCreating={createMutation.isPending}
            />
        );
    }

    // B. Form Exists (Locked or Unlocked)
    return (
        <div className="flex flex-col h-[calc(100vh-7rem)] min-h-0 gap-3 overflow-hidden">
            {/* Top Action Header */}
            <EventFormHeader
                eventForm={eventForm}
                eventName={event.name}
                onLockClick={handleLockClick}
                isLocking={lockMutation.isPending}
                onDeleteForm={handleDeleteForm}
                isDeleting={deleteMutation.isPending}
                onOpenConfig={() => {
                    setIsLockPrompt(false);
                    setIsConfigOpen(true);
                }}
                onOpenShare={() => setIsSharingOpen(true)}
                onOpenFee={() => setIsFeeOpen(true)}
                hasUnsavedChanges={hasUnsavedChanges}
                onSaveChanges={handleSaveDesignerFields}
                isSaving={updateMutation.isPending}
            />

            {/* Main Layout: Split view with Designer Canvas (Left) + Live Form Preview (Right) */}
            <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-xl border divide-y lg:divide-y-0 lg:divide-x bg-card shadow-xs">
                {/* First part: Form Edit Section (Left Window) */}
                <section className="h-full min-h-0 overflow-hidden flex flex-col">
                    <FormDesignerCanvas
                        form={{ name: eventForm.name }}
                        fields={designerFields}
                        onFieldsChange={setDraftFields}
                        onSave={handleSaveDesignerFields}
                        isSaving={updateMutation.isPending}
                        hasUnsavedChanges={hasUnsavedChanges}
                        isPublished={eventForm.is_locked}
                    />
                </section>

                {/* Second part: Live Form Preview Section (Right Window) */}
                <section className="h-full min-h-0 overflow-hidden flex flex-col bg-muted/10">
                    <FormPreviewPanel
                        form={{ name: eventForm.name }}
                        fields={designerFields}
                    />
                </section>
            </main>

            <ApplicationFeeDialog eventId={eventId} open={isFeeOpen} onOpenChange={setIsFeeOpen} />

            {/* Registration Config Dialog */}
            <EventFormSettingsDialog
                eventForm={eventForm}
                open={isConfigOpen}
                onOpenChange={setIsConfigOpen}
                onSaveSettings={handleSaveSettings}
                isSaving={updateMutation.isPending}
                isLockPrompt={isLockPrompt}
                onProceedToLock={() => setIsLockConfirmOpen(true)}
            />

            {/* Lock Form Confirmation Dialog */}
            <AlertDialog open={isLockConfirmOpen} onOpenChange={setIsLockConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Lock className="size-4 text-primary" />
                            <span>Lock Registration Form?</span>
                        </AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        <AlertDialogDescription className="space-y-2">
                            <span>
                                Locking makes the form schema immutable and activates public registration and QR code sharing.
                            </span>
                            <span className="block font-medium text-foreground">
                                Once locked, form fields cannot be edited. Ensure your fields, validation rules, capacity, and deadline are correct.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            Continue Editing
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmLock}
                            className="font-semibold"
                        >
                            Confirm & Lock
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* QR Code & Share Modal */}
            <QrSharingDialog
                eventForm={eventForm}
                open={isSharingOpen}
                onOpenChange={setIsSharingOpen}
            />
        </div>
    );
}
