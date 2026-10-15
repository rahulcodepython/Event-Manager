"use client"

import type * as React from "react"
import Link from "next/link"
import { CheckCircle2Icon, ClockIcon, Loader2, LockIcon, MailIcon, RotateCwIcon, SendIcon, XCircleIcon } from "lucide-react"

import { CardScheduleForm } from "../../../../../components/cards/card-schedule-form"
import { useEventPage } from "../../../../../components/events/event-context"
import { ConfirmButton, PageHeader } from "../../../../../components/generic"
import { Badge } from "../../../../../components/ui/badge"
import { Button } from "../../../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card"
import {
    useCardStatusQuery,
    useCloseApplicationsMutation,
    usePublishCardsMutation,
    useResendCardsMutation,
} from "../../../../../query-hooks/cards.api"

const formatDateTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"

function Count({ label, value, icon: Icon, className }: {
    label: string
    value: number
    icon: React.ComponentType<{ className?: string }>
    className?: string
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border p-3">
            <Icon className={className ?? "size-4 text-muted-foreground"} />
            <div className="flex flex-col">
                <span className="text-lg font-semibold leading-none">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
        </div>
    )
}

export default function EventCardsPage() {
    const { eventId } = useEventPage("ID Cards")
    const { data: status, isLoading } = useCardStatusQuery(eventId)
    const close = useCloseApplicationsMutation(eventId)
    const publish = usePublishCardsMutation(eventId)
    const resend = useResendCardsMutation(eventId)

    if (isLoading || !status) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
            </div>
        )
    }

    if (!status.has_form) {
        return (
            <div className="container flex flex-col gap-6 pb-8">
                <PageHeader title="ID Cards" description="Email every applicant their ID card with a signed QR code." />
                <Card>
                    <CardContent className="flex flex-col items-start gap-3 text-sm">
                        <span>Create a registration form first. Its closing date sets when cards can be sent.</span>
                        <Button nativeButton={false} render={<Link href={`/dashboard/events/${eventId}/form`} />}>
                            Set up registration form
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const published = Boolean(status.published_at)
    const { counts } = status

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader
                title="ID Cards"
                description="Each applicant gets a PDF ID card by email once applications close. The QR code is signed, so cards cannot be forged."
                badge={
                    published ? <Badge>Published</Badge> : status.is_closed ? <Badge variant="secondary">Applications closed</Badge> : <Badge variant="outline">Applications open</Badge>
                }
                actions={
                    <>
                        {
                            !published && !status.is_closed && <ConfirmButton
                                trigger={
                                    <Button variant="outline" className="gap-2">
                                        <LockIcon className="size-4" />
                                        Close applications now
                                    </Button>
                                }
                                title="Close applications now?"
                                description="The public form stops accepting entries and applicants can no longer be added or removed. You can reopen by moving the closing date into the future until cards are published."
                                confirmLabel="Close now"
                                onConfirm={() => close.mutateAsync()}
                            />
                        }
                        {
                            !published && <ConfirmButton
                                trigger={
                                    <Button className="gap-2" disabled={!status.is_closed}>
                                        <SendIcon className="size-4" />
                                        Publish cards now
                                    </Button>
                                }
                                title="Email all ID cards now?"
                                description={`Every applicant (${counts.pending}) gets their card by email. After this the schedule is frozen and applications cannot reopen.`}
                                confirmLabel="Publish now"
                                onConfirm={() => publish.mutateAsync()}
                            />
                        }
                    </>
                }
            />

            {
                published ? <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Schedule</CardTitle>
                        <CardDescription>Cards are published, so the schedule can no longer change.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">Applications closed</span>
                            <span className="font-medium">{formatDateTime(status.closes_at)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">Scheduled for</span>
                            <span className="font-medium">{formatDateTime(status.publish_at)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">Published</span>
                            <span className="font-medium">{formatDateTime(status.published_at)}</span>
                        </div>
                    </CardContent>
                </Card> : <CardScheduleForm key={`${status.closes_at}|${status.publish_at}`} eventId={eventId} status={status} />
            }

            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex flex-col gap-1.5">
                        <CardTitle className="text-base">Delivery</CardTitle>
                        <CardDescription>Open an applicant on the Applicants page to download or resend one card.</CardDescription>
                    </div>
                    {
                        published && <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                disabled={counts.failed === 0 || resend.isPending}
                                onClick={() => resend.mutate("failed")}
                            >
                                <RotateCwIcon className="size-3.5" />
                                Retry failed
                            </Button>
                            <ConfirmButton
                                trigger={
                                    <Button variant="outline" size="sm" className="gap-1.5">
                                        <MailIcon className="size-3.5" />
                                        Resend all
                                    </Button>
                                }
                                title="Resend every card?"
                                description="All applicants get their card by email again."
                                confirmLabel="Resend all"
                                onConfirm={() => resend.mutateAsync("all")}
                            />
                        </div>
                    }
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Count label="Not sent" value={counts.pending} icon={ClockIcon} />
                    <Count label="Sending" value={counts.queued} icon={Loader2} className={counts.queued ? "size-4 animate-spin text-primary" : "size-4 text-muted-foreground"} />
                    <Count label="Sent" value={counts.sent} icon={CheckCircle2Icon} className="size-4 text-emerald-600" />
                    <Count label="Failed" value={counts.failed} icon={XCircleIcon} className="size-4 text-destructive" />
                </CardContent>
            </Card>
        </div>
    )
}
