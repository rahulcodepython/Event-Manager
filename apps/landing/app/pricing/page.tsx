import type { Metadata } from "next"

import { PricingCalculator } from "../../components/site/pricing-calculator"
import { getCatalog } from "../../lib/api"
import type { Catalog } from "../../lib/pricing.types"

export const metadata: Metadata = { title: "Pricing" }

// Rendered on the server with a cached catalog (PRICING_CATALOG_REVALIDATE
// seconds); the calculator reloads it and quotes live on the client.
const catalogRevalidate = Number(process.env.PRICING_CATALOG_REVALIDATE) || 300

async function loadCatalog(): Promise<Catalog | null> {
    try {
        return await getCatalog({ next: { revalidate: catalogRevalidate } } as RequestInit)
    } catch {
        return null
    }
}

export default async function PricingPage() {
    const catalog = await loadCatalog()

    return (
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16">
            <div className="flex flex-col gap-3 text-center">
                <h1 className="text-4xl font-bold tracking-tight">Pricing</h1>
                <p className="mx-auto max-w-2xl text-muted-foreground">
                    No subscription. Buy a credit for each event with exactly what it needs. Prices include a base fee; tax is shown separately.
                </p>
            </div>
            <PricingCalculator initialCatalog={catalog} />
        </div>
    )
}
