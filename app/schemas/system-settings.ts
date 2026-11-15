// Client-safe. The settings a SYSTEM_ADMIN can change in the app, and the form that edits them.
// Stored one row per key in SystemSetting; defaults come from .env (see settings.server.ts).
import { z } from "zod";

export const MEBIBYTE = 1024 * 1024;
export const SUGGESTIONS_MAX_PER_DAY_LIMIT = 100;
export const UPLOAD_MAX_MEGABYTES_LIMIT = 50;

const contactEmail = z.email().max(254).nullable();

export const SystemSettingsSchema = z.object({
  /** Shown to teachers on the subjects page; null hides the callout. */
  contactEmail,
  /** Improvement suggestions one user may submit per 24 hours. */
  suggestionsMaxPerDay: z.number().int().min(1).max(SUGGESTIONS_MAX_PER_DAY_LIMIT),
  /** When false nobody can create an account. */
  registrationOpen: z.boolean(),
  /** Largest image the content editor accepts. */
  uploadMaxBytes: z
    .number()
    .int()
    .min(1024)
    .max(UPLOAD_MAX_MEGABYTES_LIMIT * MEBIBYTE),
});
export type SystemSettings = z.infer<typeof SystemSettingsSchema>;
export type SystemSettingKey = keyof SystemSettings;

/**
 * The settings form: values arrive as strings, an empty email means "none", an unchecked
 * checkbox is absent, and the upload limit is entered in whole megabytes.
 */
export const SystemSettingsFormSchema = z
  .object({
    contactEmail: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : value))
      .pipe(contactEmail),
    suggestionsMaxPerDay: z.coerce.number().int().min(1).max(SUGGESTIONS_MAX_PER_DAY_LIMIT),
    registrationOpen: z.preprocess((value) => value === "on", z.boolean()),
    uploadMaxMegabytes: z.coerce.number().int().min(1).max(UPLOAD_MAX_MEGABYTES_LIMIT),
  })
  .transform(({ uploadMaxMegabytes, ...rest }): SystemSettings => ({
    ...rest,
    uploadMaxBytes: uploadMaxMegabytes * MEBIBYTE,
  }));
export type SystemSettingsFormField =
  "contactEmail" | "suggestionsMaxPerDay" | "registrationOpen" | "uploadMaxMegabytes";
