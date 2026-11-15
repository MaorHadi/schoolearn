// Client-safe. A form field that carries a whole editor state as one JSON string.
import { z } from "zod";

/** Parse the string as JSON, then validate the result with `schema`. */
export function jsonField<Schema extends z.ZodType>(schema: Schema, invalidJsonMessage: string) {
  return z
    .string()
    .transform((raw, context) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: invalidJsonMessage });
        return z.NEVER;
      }
    })
    .pipe(schema);
}
