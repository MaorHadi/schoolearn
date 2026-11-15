// Shared (client-safe). Maps zod issues to one user-facing message key per field.
import type { ZodError } from "zod";
import { t, type TranslationKey } from "~/i18n";

/** What an action answers with when the whole form (not one field) was refused. */
export interface FormError {
  formError: TranslationKey;
}

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

/** What a form needs per field from the action's errors: the message and `aria-invalid`. */
export function fieldErrorHelpers<Field extends string>(
  fieldErrors: Partial<Record<Field, TranslationKey>> = {},
) {
  return {
    errorFor: (field: Field): string | undefined => {
      const key = fieldErrors[field];
      return key ? t(key) : undefined;
    },
    invalid: (field: Field): true | undefined => (fieldErrors[field] ? true : undefined),
  };
}
