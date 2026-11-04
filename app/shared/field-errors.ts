// Shared (client-safe). Maps zod issues to one user-facing message key per field.
import type { ZodError } from "zod";
import type { TranslationKey } from "~/i18n";

/**
 * For each failed top-level field that has an entry in `messages`, pick that field's message.
 * Fields outside the map are ignored so unexpected input never leaks internal detail.
 */
export function fieldErrorsFrom<Field extends string>(
  error: ZodError,
  messages: Record<Field, TranslationKey>,
): Partial<Record<Field, TranslationKey>> {
  const errors: Partial<Record<Field, TranslationKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && field in messages) {
      errors[field as Field] = messages[field as Field];
    }
  }
  return errors;
}
