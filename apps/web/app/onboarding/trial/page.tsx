"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, FlaskConicalIcon, Loader2 } from "lucide-react"

import { FullPageLoader } from "../../../components/auth/full-page-loader"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card"
import { useMeQuery } from "../../../query-hooks/auth.api"
import { useClaimTrialMutation, useSkipTrialMutation } from "../../../query-hooks/credits.api"
import { useCatalogQuery } from "../../../query-hooks/pricing.api"
import type { CatalogFeature } from "../../../schema/pricing.types"

function trialLabel(feature: CatalogFeature) {
    if (feature.value_type === "boolean") return feature.trial_value ? "Included" : "Not included"
    const option = feature.options.find((o) => o.value === feature.trial_value)
    if (option) return option.label
    return feature.trial_value === 0 ? "None" : `${feature.trial_value} ${feature.unit}`.trim()
}

export default function TrialPage() {
    const router = useRouter()
    const { data: me, isLoading } = useMeQuery()
    const { data: catalog } = useCatalogQuery()
    const claim = useClaimTrialMutation()
    const skip = useSkipTrialMutation()

    const decided = Boolean(me?.organization?.trial_choice)

    React.useEffect(() => {
        if (!me) return
        if (!me.organization) router.replace("/onboarding")
        else if (decided) router.replace("/dashboard")
    }, [me, decided, router])

    const startTrial = async () => {
        try {
            await claim.mutateAsync()
            router.replace("/dashboard/credits")
        } catch {
            // Handled by mutation toast
        }
    }

    const buyInstead = async () => {
        try {
            await skip.mutateAsync()
            router.replace("/dashboard/credits/new")
        } catch {
            // Handled by mutation toast
        }
    }

    if (isLoading || !me?.organization || decided) {
        return <FullPageLoader label="Loading..." />
    }

    const busy = claim.isPending || skip.isPending

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <FlaskConicalIcon className="size-5 text-primary" />
                        <CardTitle className="text-xl">Try IdentityCard free</CardTitle>
                    </div>
                    <CardDescription>
                        A one-time free credit to explore the platform. This offer is shown only once.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <ul className="flex flex-col gap-2 rounded-md border p-3 text-sm">
                        {
                            catalog?.features.map((f) => <li key={f.key} className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2">
                                    <CheckIcon className="size-4 text-primary" />
                                    {f.name}
                                </span>
                                <span className="text-muted-foreground">{trialLabel(f)}</span>
                            </li>)
                        }
                        {
                            catalog && <li className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2">
                                    <CheckIcon className="size-4 text-primary" />
                                    Event length
                                </span>
                                <span className="text-muted-foreground">up to {catalog.trial_max_event_days} days</span>
                            </li>
                        }
                    </ul>
                    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                        <Badge variant="outline" className="shrink-0">Test only</Badge>
                        <span>
                            Events created on the trial are for trying things out, not for real use. They are deleted when the trial ends.
                        </span>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" disabled={busy} onClick={buyInstead} className="w-full sm:w-auto">
                        Skip and buy a credit
                    </Button>
                    <Button disabled={busy} onClick={startTrial} className="w-full gap-2 sm:w-auto">
                        {
                            claim.isPending && <Loader2 className="size-4 animate-spin" />
                        }
                        Start free trial
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
