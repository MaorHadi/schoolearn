// Shared (client-safe). Maps validation failures to user-facing message keys.
import type { ZodError } from "zod";
import type { TranslationKey } from "~/i18n";

export type RegisterField = "username" | "email" | "password";
export type FieldErrors = Partial<Record<RegisterField, TranslationKey>>;

const FIELD_MESSAGE: Record<RegisterField, TranslationKey> = {
  username: "auth.error.username",
  email: "auth.error.email",
  password: "auth.error.password",
};

/**
 * Field-level messages for registration input problems. These describe the rules the user
 * can see, so they reveal nothing about existing accounts.
 */
export function registerFieldErrors(error: ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === "username" || field === "email" || field === "password") {
      errors[field] = FIELD_MESSAGE[field];
    }
  }
  return errors;
}
