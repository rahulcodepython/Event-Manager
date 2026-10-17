import type { SubEventDay } from "../schema/subevents.types";

const fmt = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** "24 Oct" or "24 Oct – 26 Oct (3 days)", or "No days set". */
export function daysSummary(days: SubEventDay[]): string {
    if (days.length === 0) return "No days set";
    const first = days[0].date;
    const last = days[days.length - 1].date;
    if (days.length === 1) return `${fmt(first)}, ${days[0].start_time}–${days[0].end_time}`;
    return `${fmt(first)} – ${fmt(last)} (${days.length} days)`;
}
