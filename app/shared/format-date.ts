// Shared (client-safe). Dates as the interface shows them. The zone is fixed so the server and
// the browser render the same text (no hydration mismatch).
const ZONE = { timeZone: "Asia/Jerusalem" } as const;
const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", ...ZONE });
const dateTimeFormat = new Intl.DateTimeFormat("he-IL", {
  dateStyle: "medium",
  timeStyle: "short",
  ...ZONE,
});

/** Loader data arrives as a Date on the server and a string in the browser. */
type DateInput = Date | string;

export function formatDate(value: DateInput): string {
  return dateFormat.format(new Date(value));
}

export function formatDateTime(value: DateInput): string {
  return dateTimeFormat.format(new Date(value));
}
