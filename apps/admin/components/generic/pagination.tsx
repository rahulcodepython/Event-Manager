import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "../ui/button"

export function Pagination({ page, limit, total, onPage }: {
    page: number
    limit: number
    total: number
    onPage: (page: number) => void
}) {
    const pages = Math.max(1, Math.ceil(total / limit))

    return (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{total} total</span>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
                    <ChevronLeftIcon />
                </Button>
                <span>Page {page} of {pages}</span>
                <Button variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
                    <ChevronRightIcon />
                </Button>
            </div>
        </div>
    )
}
