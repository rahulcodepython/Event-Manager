"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
} from "../../../../components/ui/alert-dialog";
import {
    ContextMenuItem,
    ContextMenuSeparator,
} from "../../../../components/ui/context-menu";
import { CreateFormDialog } from "../../../../components/forms/create-form-dialog";
import { UpdateFormDialog } from "../../../../components/forms/update-form-dialog";
import { formsColumns } from "../../../../components/forms/forms-columns";
import { InfiniteDataTable } from "../../../../components/generic";
import { useBreadcrumbs } from "../../../../hooks/use-breadcrumbs";
import {
    useDeleteFormMutation,
    useFormsInfiniteQuery,
} from "../../../../query-hooks/forms.api";
import type { Form } from "../../../../schema/forms.types";

export default function FormsPage() {
    const router = useRouter();
    const [search, setSearch] = React.useState("");
    const [editingForm, setEditingForm] = React.useState<Form | null>(null);
    const [deletingForm, setDeletingForm] = React.useState<Form | null>(null);

    useBreadcrumbs([
        {
            title: "Dashboard",
            url: "/dashboard",
        },
        {
            title: "Management",
        },
        {
            title: "Forms",
        },
    ]);

    const {
        data,
        isLoading,
        isError,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useFormsInfiniteQuery({ search });

    const deleteMutation = useDeleteFormMutation();

    const flatForms = React.useMemo(() => {
        return data?.pages.flatMap((page) => page.data) ?? [];
    }, [data]);

    const totalCount = data?.pages[0]?.total ?? flatForms.length;

    const handleDelete = async () => {
        if (!deletingForm) return;
        try {
            await deleteMutation.mutateAsync(deletingForm.id);
            setDeletingForm(null);
        } catch {
            // Handled by mutation toast
        }
    };

    const renderRowContextMenu = (row: { original: Form }) => {
        const form = row.original;
        return (
            <>
                <ContextMenuItem
                    onClick={() => router.push(`/dashboard/forms/${form.id}/design`)}
                    className="gap-2.5 font-medium"
                >
                    <ExternalLink className="size-3.5 text-primary" />
                    <span>Visit Form Designer</span>
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem
                    onClick={() => setEditingForm(form)}
                    className="gap-2.5"
                >
                    <Pencil className="size-3.5" />
                    <span>Edit Metadata</span>
                </ContextMenuItem>

                <ContextMenuItem
                    onClick={() => {
                        navigator.clipboard.writeText(form.id);
                        toast.success("Template ID copied to clipboard");
                    }}
                    className="gap-2.5"
                >
                    <Copy className="size-3.5" />
                    <span>Copy Template ID</span>
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem
                    onClick={() => setDeletingForm(form)}
                    variant="destructive"
                    className="gap-2.5"
                >
                    <Trash2 className="size-3.5" />
                    <span>Delete Form Template</span>
                </ContextMenuItem>
            </>
        );
    };

    return (
        <>
            <InfiniteDataTable
                columns={formsColumns}
                data={flatForms}
                totalCount={totalCount}
                isLoading={isLoading}
                isError={isError}
                error={error}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                searchPlaceholder="Search forms..."
                onSearchChange={setSearch}
                toolbarActions={<CreateFormDialog />}
                itemLabel="forms"
                renderRowContextMenu={renderRowContextMenu}
            />

            {/* Edit Form Metadata Dialog */}
            {editingForm && (
                <UpdateFormDialog
                    form={editingForm}
                    open={!!editingForm}
                    onOpenChange={(open) => {
                        if (!open) setEditingForm(null);
                    }}
                />
            )}

            {/* Delete Form Confirmation AlertDialog */}
            <AlertDialog
                open={!!deletingForm}
                onOpenChange={(open) => {
                    if (!open) setDeletingForm(null);
                }}
            >
                <AlertDialogContent className="sm:max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">
                            Delete Form Template
                        </AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        <AlertDialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-foreground">
                                &ldquo;{deletingForm?.name}&rdquo;
                            </span>
                            ? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
