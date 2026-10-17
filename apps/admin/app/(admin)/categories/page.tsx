"use client"

import { CategoryColumn } from "../../../components/ledger/category-column"
import { PageHeader } from "../../../components/generic/page-header"
import { PageLoader } from "../../../components/generic/page-loader"
import { useBreadcrumbs } from "../../../hooks/use-breadcrumbs"
import { useCategoriesQuery } from "../../../query-hooks/ledger.api"

export default function CategoriesPage() {
    const { data: categories, isLoading } = useCategoriesQuery()

    useBreadcrumbs([{ title: "Categories" }])

    return (
        <div className="container flex flex-col gap-6 pb-8">
            <PageHeader title="Categories" description="Group manual ledger entries and subscriptions. Client payments need no category." />
            {
                isLoading || !categories ? <PageLoader /> : <div className="grid items-start gap-4 lg:grid-cols-2">
                    <CategoryColumn kind="income" categories={categories.filter((c) => c.kind === "income")} />
                    <CategoryColumn kind="expense" categories={categories.filter((c) => c.kind === "expense")} />
                </div>
            }
        </div>
    )
}
