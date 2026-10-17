/**
 * Shared date/schedule helpers for the event-dates calendar feature.
 * Centralized here so page.tsx and EventCalendar don't each reimplement
 * date-key formatting and "is this a custom schedule" logic.
 */

export interface DateScheduleInfo {
    startTime: string;
    endTime: string;
    isCustom: boolean;
}

export type DateScheduleMap = Record<string, DateScheduleInfo>;

/** Formats a Date as a local "YYYY-MM-DD" key (avoids UTC-shift bugs from toISOString). */
export function toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/** Formats a Date as a "YYYY-MM" key. */
export function toMonthKey(date: Date): string {
    return toDateKey(date).slice(0, 7);
}

/** Inclusive check for whether a "YYYY-MM-DD" string falls within [startDate, endDate]. */
export function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
    return dateStr >= startDate && dateStr <= endDate;
}

/** A schedule counts as "custom" when it differs from the event's default hours. */
export function isCustomSchedule(
    startTime: string,
    endTime: string,
    defaultStartTime: string,
    defaultEndTime: string
): boolean {
    return startTime !== defaultStartTime || endTime !== defaultEndTime;
}

export function formatTime12Hour(time: string): string {
    const [hoursStr, minutes] = time.split(":");
    const hours = Number(hoursStr);
    if (Number.isNaN(hours) || !minutes) return time;

    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
}
/** ISO timestamp to the local "YYYY-MM-DDTHH:MM" a datetime-local input takes. */
export function toDatetimeLocal(iso?: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A datetime-local value (local time) to an ISO timestamp. */
export function fromDatetimeLocal(value: string): string {
    return new Date(value).toISOString();
}
