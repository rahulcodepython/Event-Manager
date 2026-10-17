import type { Event } from "../../schema/events.types"

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

/** Explains trial and expired-credit limits at the top of every event page. */
export function EventCreditNotice({ credit }: { credit: NonNullable<Event["credit"]> }) {
    if (credit.is_expired) {
        return (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                This event&apos;s credit ended on {formatDate(credit.ends_at)}. The event is read-only: no registrations,
                scans or changes. All its data will be deleted on {formatDate(credit.prune_at)}.
            </div>
        )
    }

    if (credit.kind === "trial") {
        return (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                Trial event: for testing only, not for real use. It will be deleted when the trial ends on{" "}
                {formatDate(credit.ends_at)}.
            </div>
        )
    }

    return null
}
