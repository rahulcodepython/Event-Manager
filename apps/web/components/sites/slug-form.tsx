"use client"

import * as React from "react"
import { CheckCircle2Icon, Loader2, XCircleIcon } from "lucide-react"

import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { useClaimSlugMutation, useSlugCheckQuery } from "../../query-hooks/sites.api"
import { siteUrl, type Site } from "../../schema/sites.types"

/** Claim or change the event's subdomain, with a live availability check. */
export function SlugForm({ eventId, site }: { eventId: string, site: Site }) {
    const [value, setValue] = React.useState(site.slug ?? "")
    const [debounced, setDebounced] = React.useState(value)
    const claim = useClaimSlugMutation(eventId)

    React.useEffect(() => {
        const t = setTimeout(() => setDebounced(value.trim().toLowerCase()), 300)
        return () => clearTimeout(t)
    }, [value])

    const unchanged = debounced === (site.slug ?? "")
    const { data: check, isFetching } = useSlugCheckQuery(eventId, unchanged ? "" : debounced)

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Subdomain</CardTitle>
                <CardDescription>
                    3 to 40 lowercase letters, digits or hyphens. Changing it frees the old address right away.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <Label htmlFor="slug">Address</Label>
                <Input
                    id="slug"
                    placeholder="my-event"
                    value={value}
                    onChange={(e) => setValue(e.target.value.toLowerCase())}
                />
                <p className="break-all font-mono text-xs text-muted-foreground">{siteUrl(debounced)}</p>
                {
                    !unchanged && debounced && <p className="flex items-center gap-1.5 text-xs">
                        {
                            isFetching ? <Loader2 className="size-3.5 animate-spin" /> : check?.available ? <>
                                <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                                <span className="text-emerald-700 dark:text-emerald-400">Available</span>
                            </> : check && <>
                                <XCircleIcon className="size-3.5 text-destructive" />
                                <span className="text-destructive">{check.reason}</span>
                            </>
                        }
                    </p>
                }
            </CardContent>
            <CardFooter className="justify-end">
                <Button
                    onClick={() => claim.mutate(debounced)}
                    disabled={unchanged || !check?.available || claim.isPending}
                    className="gap-2"
                >
                    {
                        claim.isPending && <Loader2 className="size-4 animate-spin" />
                    }
                    {site.slug ? "Change subdomain" : "Claim subdomain"}
                </Button>
            </CardFooter>
        </Card>
    )
}
