"use client"

import Link from "next/link"
import { Loader2, PlusIcon, TicketIcon } from "lucide-react"

import { CreditCard } from "../../../components/credits/credit-card"
import { PageHeader } from "../../../components/generic"
import { Button } from "../../../components/ui/button"
import { Card } from "../../../components/ui/card"
import { useBreadcrumbs } from "../../../hooks/use-breadcrumbs"
import { useCreditsQuery } from "../../../query-hooks/credits.api"

export default function CreditsPage() {
    const { data: credits = [], isLoading } = useCreditsQuery()

    useBreadcrumbs([
        { title: "Dashboard", url: "/dashboard" },
        { title: "Credits" },
    ])

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader
                title="Credits"
                description="Each credit runs one event at a time within its validity. Delete an event to reuse its credit."
                actions={
                    <Button nativeButton={false} render={<Link href="/dashboard/credits/new" />} className="gap-2">
                        <PlusIcon className="size-4" />
                        Buy credit
                    </Button>
                }
            />

            {
                isLoading ? <div className="flex h-48 items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-primary" />
                </div> : credits.length === 0 ? <Card className="flex flex-col items-center gap-3 p-12 text-center">
                    <TicketIcon className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No credits yet. Buy one to create your first event.</p>
                </Card> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {
                        credits.map((credit) => <CreditCard key={credit.id} credit={credit} />)
                    }
                </div>
            }
        </div>
    )
}
