// Shared (client-safe). Turns a submitted `from`/`to` pair into query bounds.
import type { DateRangeQuery } from "~/schemas/date-range";
import { DAY_MS } from "~/shared/time";

interface ResolvedDateRange {
  /** Inclusive start (midnight UTC of `from`, or now minus `defaultDays`). */
  since: Date;
  /** Exclusive end (midnight UTC after `to`, or now). */
  until: Date;
  /** The pair as `yyyy-mm-dd`, for re-filling the form. */
  from: string;
  to: string;
}

/** `yyyy-mm-dd` for a Date, in UTC. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Resolve the range the user asked for. Missing `from` falls back to `defaultDays` before now;
 * missing `to` means "up to now". Dates are read as UTC calendar days.
 */
export function resolveDateRange(
  range: DateRangeQuery,
  defaultDays: number,
  now = new Date(),
): ResolvedDateRange {
  const since = range.from
    ? new Date(`${range.from}T00:00:00Z`)
    : new Date(now.getTime() - defaultDays * DAY_MS);
  const until = range.to ? new Date(new Date(`${range.to}T00:00:00Z`).getTime() + DAY_MS) : now;
  return { since, until, from: toIsoDate(since), to: toIsoDate(range.to ? until : now) };
}
