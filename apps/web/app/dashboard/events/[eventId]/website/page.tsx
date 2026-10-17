"use client"

import { ExternalLinkIcon, Loader2, Trash2Icon } from "lucide-react"

import { useEventPage } from "../../../../../components/events/event-context"
import { ConfirmButton, PageHeader } from "../../../../../components/generic"
import { SiteUpload } from "../../../../../components/sites/site-upload"
import { SlugForm } from "../../../../../components/sites/slug-form"
import { Badge } from "../../../../../components/ui/badge"
import { Button } from "../../../../../components/ui/button"
import { Card, CardContent } from "../../../../../components/ui/card"
import { useDeleteSiteMutation, useSiteQuery } from "../../../../../query-hooks/sites.api"

const formatBytes = (n: number) => n < 1024 ? `${n} B` : n < 1 << 20 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1 << 20)).toFixed(1)} MB`

export default function EventWebsitePage() {
    const { eventId } = useEventPage("Website")
    const { data: site, isLoading } = useSiteQuery(eventId)
    const remove = useDeleteSiteMutation(eventId)

    if (isLoading || !site) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader
                title="Website"
                description="Upload your own static site for this event at its own subdomain. It goes offline when the event's credit ends."
                badge={
                    site.live ? <Badge>Live</Badge> : site.slug ? <Badge variant="outline">Not live</Badge> : undefined
                }
                actions={
                    site.slug && <>
                        {
                            site.url && site.live && <Button
                                variant="outline"
                                className="gap-2"
                                nativeButton={false}
                                render={<a href={site.url} target="_blank" rel="noreferrer" />}
                            >
                                <ExternalLinkIcon className="size-4" />
                                Open site
                            </Button>
                        }
                        <ConfirmButton
                            trigger={
                                <Button variant="destructive" className="gap-2">
                                    <Trash2Icon className="size-4" />
                                    Delete site
                                </Button>
                            }
                            title="Delete the website?"
                            description="Its files are deleted and the subdomain is freed for anyone to claim."
                            confirmLabel="Delete"
                            destructive
                            onConfirm={() => remove.mutateAsync()}
                        />
                    </>
                }
            />

            {
                !site.entitled ? <Card>
                    <CardContent className="text-sm text-muted-foreground">
                        This event&apos;s credit does not include an event website. Choose &quot;Event website&quot; when you buy a credit.
                    </CardContent>
                </Card> : <>
                    {
                        site.has_files && <Card>
                            <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-muted-foreground">Address</span>
                                    <span className="break-all font-mono text-xs">{site.url}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-muted-foreground">Files</span>
                                    <span className="font-medium">{site.file_count} · {formatBytes(site.total_bytes)}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs text-muted-foreground">Uploaded</span>
                                    <span className="font-medium">{site.uploaded_at ? new Date(site.uploaded_at).toLocaleString() : "—"}</span>
                                </div>
                            </CardContent>
                        </Card>
                    }
                    <SlugForm key={site.slug ?? ""} eventId={eventId} site={site} />
                    <SiteUpload eventId={eventId} disabled={!site.slug} />
                </>
            }
        </div>
    )
}
