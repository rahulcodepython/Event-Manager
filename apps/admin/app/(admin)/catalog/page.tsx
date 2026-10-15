"use client"

import { PencilIcon } from "lucide-react"

import { FeatureDialog } from "../../../components/catalog/feature-dialog"
import { SettingsCard } from "../../../components/catalog/settings-card"
import { PageHeader } from "../../../components/generic/page-header"
import { PageLoader } from "../../../components/generic/page-loader"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { useBreadcrumbs } from "../../../hooks/use-breadcrumbs"
import { formatMoney } from "../../../lib/money"
import { useCatalogQuery } from "../../../query-hooks/catalog.api"
import type { Feature } from "../../../schema/catalog.types"

function rateText(f: Feature, r: Feature["rates"][number]) {
    const range = r.max_value === null ? `${r.min_value}+` : r.min_value === r.max_value ? `${r.min_value}` : `${r.min_value}–${r.max_value}`
    const per = f.pricing_type === "per_unit" ? ` per ${r.unit_size > 1 ? `${r.unit_size} ` : ""}${f.unit || "unit"}` : ""
    return `${range}: ${formatMoney(r.price)}${per}`
}

export default function CatalogPage() {
    const { data: catalog, isLoading } = useCatalogQuery()

    useBreadcrumbs([{ title: "Pricing catalog" }])

    if (isLoading || !catalog) {
        return <PageLoader />
    }

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader title="Pricing catalog" description="What clients can buy and what it costs. Feature keys are fixed because the app reads them." />

            <SettingsCard key={JSON.stringify(catalog.settings)} settings={catalog.settings} />

            <div className="grid gap-4 lg:grid-cols-2">
                {
                    catalog.features.map((f) => <Card key={f.id}>
                        <CardHeader className="flex flex-row items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-base">{f.name}</CardTitle>
                                    <Badge variant="outline" className="font-mono">{f.key}</Badge>
                                </div>
                                <CardDescription>{f.description || "—"}</CardDescription>
                            </div>
                            <FeatureDialog
                                feature={f}
                                trigger={
                                    <Button variant="outline" size="sm" className="gap-1.5">
                                        <PencilIcon className="size-3.5" />
                                        Edit
                                    </Button>
                                }
                            />
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 text-sm">
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>Pricing: {f.pricing_type.replace("_", " ")}</span>
                                <span>Default: {f.options.find((o) => o.value === f.default_value)?.label ?? f.default_value}</span>
                                <span>Trial: {f.trial_value}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {
                                    f.options.map((o) => <Badge key={o.value} variant={o.is_active ? "secondary" : "outline"} className={o.is_active ? "" : "line-through"}>
                                        {o.label}
                                    </Badge>)
                                }
                            </div>
                            <ul className="flex flex-col gap-0.5 text-xs">
                                {
                                    f.rates.length === 0 && <li className="text-muted-foreground">No rates: free.</li>
                                }
                                {
                                    f.rates.map((r, i) => <li key={i}>{rateText(f, r)}</li>)
                                }
                            </ul>
                        </CardContent>
                    </Card>)
                }
            </div>
        </div>
    )
}
