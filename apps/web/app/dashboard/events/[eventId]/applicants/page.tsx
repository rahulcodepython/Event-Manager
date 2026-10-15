"use client"

import * as React from "react"
import Link from "next/link"
import {
    Copy,
    Eye,
    FileText,
    Hourglass,
    Loader2,
    Mail,
    Phone,
    QrCode,
    RotateCcw,
    Trash2,
    Upload,
    UserPlus,
} from "lucide-react"
import { toast } from "sonner"

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
} from "../../../../../components/ui/alert-dialog"
import {
    ContextMenuItem,
    ContextMenuSeparator,
} from "../../../../../components/ui/context-menu"
import { ApplicantDataDialog } from "../../../../../components/applicants/applicant-data-dialog"
import { ApplicantFilterBadges } from "../../../../../components/applicants/applicant-filter-badges"
import { ApplicantFilterForm } from "../../../../../components/applicants/applicant-filter-form"
import { ApplicationsInProgressDialog } from "../../../../../components/applicants/applications-in-progress-dialog"
import { RefundApplicantDialog } from "../../../../../components/applicants/refund-applicant-dialog"
import { ApplicantQrDialog } from "../../../../../components/applicants/applicant-qr-dialog"
import { BulkUploadApplicantsDialog } from "../../../../../components/applicants/bulk-upload-applicants-dialog"
import { CreateApplicantDialog } from "../../../../../components/applicants/create-applicant-dialog"
import { getApplicantsColumns } from "../../../../../components/applicants/applicants-columns"
import { useCardStatusQuery } from "../../../../../query-hooks/cards.api"
import { useEventPage } from "../../../../../components/events/event-context"
import {
    InfiniteDataTable,
    PageHeader,
} from "../../../../../components/generic"
import { Button } from "../../../../../components/ui/button"
import {
    useApplicantSchemaQuery,
    useApplicantsInfiniteQuery,
    useDeleteApplicantMutation,
} from "../../../../../query-hooks/applicants.api"
import type {
    ApplicantFilter,
    ApplicantItem,
} from "../../../../../schema/applicants.types"

export default function EventApplicantsPage() {
    const { event, eventId } = useEventPage("Applicants")

    const [search, setSearch] = React.useState("")
    const [filters, setFilters] = React.useState<ApplicantFilter[]>([])
    const [createOpen, setCreateOpen] = React.useState(false)
    const [bulkOpen, setBulkOpen] = React.useState(false)
    const [viewDataApplicant, setViewDataApplicant] =
        React.useState<ApplicantItem | null>(null)
    const [viewQrApplicant, setViewQrApplicant] =
        React.useState<ApplicantItem | null>(null)
    const [deleteApplicant, setDeleteApplicant] =
        React.useState<ApplicantItem | null>(null)
    const [refundApplicant, setRefundApplicant] =
        React.useState<ApplicantItem | null>(null)
    const [inProgressOpen, setInProgressOpen] = React.useState(false)

    const deleteMutation = useDeleteApplicantMutation(eventId)
    // Applicants are frozen once the application window closes.
    const { data: cardStatus } = useCardStatusQuery(eventId)
    const applicationsClosed = Boolean(cardStatus?.is_closed)
    const cardsPublished = Boolean(cardStatus?.published_at)

    // 1. Fetch form schema once for column definitions & filter attributes
    const { data: formSchema } = useApplicantSchemaQuery(eventId)

    const formFields = React.useMemo(() => {
        return formSchema?.fields || []
    }, [formSchema])

    const columns = React.useMemo(() => {
        return getApplicantsColumns(formFields, eventId)
    }, [formFields, eventId])

    // 2. Infinite pagination query for applicant data rows
    const {
        data,
        isLoading,
        isError,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useApplicantsInfiniteQuery(eventId, { search, filters })

    const flatApplicants = React.useMemo(() => {
        return data?.pages.flatMap((page) => page.data) ?? []
    }, [data])

    const totalCount = data?.pages[0]?.total ?? flatApplicants.length

    const handleDelete = async () => {
        if (!deleteApplicant) return
        try {
            await deleteMutation.mutateAsync(deleteApplicant.user_id)
            setDeleteApplicant(null)
        } catch {
            // Handled by mutation toast
        }
    }

    const renderRowContextMenu = (row: { original: ApplicantItem }) => {
        const applicant = row.original
        return (
            <>
                <ContextMenuItem
                    onClick={() => setViewDataApplicant(applicant)}
                    className="gap-2.5 font-medium"
                >
                    <Eye className="size-3.5 text-primary" />
                    <span>View Form Data</span>
                </ContextMenuItem>

                <ContextMenuItem
                    onClick={() => setViewQrApplicant(applicant)}
                    className="gap-2.5"
                >
                    <QrCode className="size-3.5 text-primary" />
                    <span>ID Card &amp; QR Code</span>
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem
                    onClick={() => {
                        navigator.clipboard.writeText(applicant.user_id)
                        toast.success("Applicant ID copied")
                    }}
                    className="gap-2.5"
                >
                    <Copy className="size-3.5" />
                    <span>Copy Applicant ID</span>
                </ContextMenuItem>

                <ContextMenuItem
                    onClick={() => {
                        navigator.clipboard.writeText(applicant.email)
                        toast.success("Email copied")
                    }}
                    className="gap-2.5"
                >
                    <Mail className="size-3.5" />
                    <span>Copy Email Address</span>
                </ContextMenuItem>

                {
                    applicant.phone && <ContextMenuItem
                        onClick={() => {
                            navigator.clipboard.writeText(applicant.phone)
                            toast.success("Mobile number copied")
                        }}
                        className="gap-2.5"
                    >
                        <Phone className="size-3.5" />
                        <span>Copy Mobile Number</span>
                    </ContextMenuItem>
                }

                {
                    applicant.paid_amount > 0 && <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                            onClick={() => setRefundApplicant(applicant)}
                            variant="destructive"
                            className="gap-2.5"
                        >
                            <RotateCcw className="size-3.5" />
                            <span>Refund &amp; Remove</span>
                        </ContextMenuItem>
                    </>
                }

                {
                    !applicationsClosed && applicant.paid_amount === 0 && <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                            onClick={() => setDeleteApplicant(applicant)}
                            variant="destructive"
                            className="gap-2.5"
                        >
                            <Trash2 className="size-3.5" />
                            <span>Delete Applicant</span>
                        </ContextMenuItem>
                    </>
                }
            </>
        )
    }

    return (
        <>
            <PageHeader
                title="Registered Applicants"
                description={`All verified attendees registered for ${event.name}.`}
                actions={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            nativeButton={false}
                            render={
                                <Link
                                    href={`/dashboard/events/${eventId}/form`}
                                />
                            }
                            className="gap-2 font-medium"
                        >
                            <FileText className="size-4" />
                            <span>Registration Form</span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setInProgressOpen(true)}
                            className="gap-2 font-medium"
                        >
                            <Hourglass className="size-4" />
                            <span>In Progress</span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBulkOpen(true)}
                            disabled={applicationsClosed}
                            title={applicationsClosed ? "The application window has closed" : undefined}
                            className="gap-2 font-medium"
                        >
                            <Upload className="size-4" />
                            <span>Bulk Upload</span>
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            disabled={applicationsClosed}
                            title={applicationsClosed ? "The application window has closed" : undefined}
                            className="gap-2 font-semibold"
                        >
                            <UserPlus className="size-4" />
                            <span>Add Applicant</span>
                        </Button>
                    </>
                }
            />

            <InfiniteDataTable
                columns={columns}
                data={flatApplicants}
                totalCount={totalCount}
                isLoading={isLoading}
                isError={isError}
                error={error}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                searchPlaceholder="Search by name, email, or applicant ID..."
                onSearchChange={setSearch}
                toolbarActions={
                    <ApplicantFilterForm
                        fields={formFields}
                        onAddFilter={(f) => setFilters((prev) => [...prev, f])}
                    />
                }
                toolbarFooter={
                    <ApplicantFilterBadges
                        filters={filters}
                        fields={formFields}
                        onRemoveFilter={(i) =>
                            setFilters((prev) =>
                                prev.filter((_, idx) => idx !== i),
                            )
                        }
                        onClearFilters={() => setFilters([])}
                    />
                }
                itemLabel="applicants"
                renderRowContextMenu={renderRowContextMenu}
            />

            <BulkUploadApplicantsDialog
                eventId={eventId}
                formFields={formFields}
                open={bulkOpen}
                onOpenChange={setBulkOpen}
            />

            <CreateApplicantDialog
                eventId={eventId}
                formFields={formFields}
                open={createOpen}
                onOpenChange={setCreateOpen}
            />

            {
                viewDataApplicant && <ApplicantDataDialog
                    eventId={eventId}
                    applicant={viewDataApplicant}
                    formFields={formFields}
                    open={!!viewDataApplicant}
                    onOpenChange={(open) => {
                        if (!open) setViewDataApplicant(null)
                    }}
                />
            }

            {
                viewQrApplicant && <ApplicantQrDialog
                    applicant={viewQrApplicant}
                    eventId={eventId}
                    canResend={cardsPublished}
                    open={!!viewQrApplicant}
                    onOpenChange={(open) => {
                        if (!open) setViewQrApplicant(null)
                    }}
                />
            }

            <RefundApplicantDialog
                eventId={eventId}
                applicant={refundApplicant}
                onOpenChange={(open) => {
                    if (!open) setRefundApplicant(null)
                }}
            />

            <ApplicationsInProgressDialog
                eventId={eventId}
                open={inProgressOpen}
                onOpenChange={setInProgressOpen}
            />

            <AlertDialog
                open={!!deleteApplicant}
                onOpenChange={(open) => {
                    if (!open) setDeleteApplicant(null)
                }}
            >
                <AlertDialogContent className="sm:max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">
                            Delete Applicant
                        </AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        <AlertDialogDescription>
                            Are you sure you want to remove{" "}
                            <span className="font-semibold text-foreground">
                                {deleteApplicant?.name}
                            </span>{" "}
                            ({deleteApplicant?.email})? This will permanently
                            delete their registration and attendance records for
                            this event.
                        </AlertDialogDescription>
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
                        >
                            {
                                deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />
                            }
                            <span>
                                {deleteMutation.isPending
                                    ? "Deleting..."
                                    : "Delete"}
                            </span>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
