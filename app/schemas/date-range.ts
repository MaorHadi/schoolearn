// Client-safe. A `from`/`to` pair of calendar dates as submitted by DateRangeFields (`yyyy-mm-dd`).
import { z } from "zod";

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Empty means "not set"; otherwise a real calendar date. */
const optionalIsoDate = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .pipe(
    z
      .string()
      .regex(ISO_DATE_RE)
      .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
      .optional(),
  )
  .optional();

export const DateRangeQuerySchema = z
  .object({ from: optionalIsoDate, to: optionalIsoDate })
  .refine((range) => !range.from || !range.to || range.from <= range.to, {
    message: "from must not be after to",
    path: ["from"],
  });
export type DateRangeQuery = z.infer<typeof DateRangeQuerySchema>;
