# System settings design (2026-11-15)

Settings a SYSTEM_ADMIN changes in the app instead of in `.env`, and a default passing score per
subject for ADMINs. Resolves `TODO(system-settings)`. The forum, which the settings were once
waiting for, was dropped and its stub removed.

## Decisions

- System admin settings (`/system-admin/settings`): teacher contact email, suggestions per user
  per day, registration open/closed, image upload size limit.
- The default passing score belongs to ADMINs and is **per subject**, not a system setting.
- Login-protection thresholds stay in `.env` (`app/server/security.server.ts`).
- `.env` stays the default: a value saved in the app overrides its `.env` value from then on.

## System settings

- Table `SystemSetting { key, value Json, updatedAt, updatedById }` (migration
  `system_settings`): one row per saved setting; a missing row means the default applies.
- `app/schemas/system-settings.ts`: `SystemSettingsSchema` (`contactEmail` email or null,
  `suggestionsMaxPerDay` 1–100, `registrationOpen` boolean, `uploadMaxBytes` 1 KiB–50 MiB) and
  `SystemSettingsFormSchema` (form strings → settings; the upload limit is entered in whole MB).
- `app/server/settings/settings.server.ts` is the only reader and writer of the table:
  - `getSystemSettings()` resolves each key from its row, falling back to the default
    (`CONTACT_EMAIL`, `SUGGESTIONS_MAX_PER_DAY`, open registration, `UPLOAD_MAX_BYTES`) when the
    row is missing or its value no longer passes the schema. No cache.
  - `updateSystemSettings(values, userId)` upserts every key in one transaction. Saving an empty
    contact email stores "none"; it does not reset to the `.env` value.
- Consumers: the subjects page loader (contact card), `createSuggestion()` (daily throttle),
  `storeUploadedImage()` and the lesson editor's declared-size check (upload limit),
  `register()` (registration switch).
- Closed registration: `register()` returns `REGISTRATION_CLOSED` before the throttle and writes
  no `AuthLog` row; the register page shows a closed notice instead of the form. `registerUser()`
  and the seed are unaffected, so the seeded admin can always be created.
- Route: loader and action call `requireRole(context, "SYSTEM_ADMIN")`; validation errors come
  back per field; success flashes `toast.settingsSaved`. `/system-admin` is a hub of links
  (users, suggestions, settings); `StubPage` is gone.

## Default passing score per subject

- `Subject.defaultPassingScore Int?`, edited in the subject details form at `/admin`.
- `effectivePassingScore(lesson, subject)`:
  `lesson.passingScore ?? subject.defaultPassingScore ?? DEFAULT_LESSON_PASSING_SCORE`.
  Used by `recordAttempt()` and the lesson page (the quiz's "score needed" text).
- Changing it never re-locks a learner: `completedAt` is set once and never cleared.

## Not included

Resetting a single setting back to its `.env` default, a change history, caching, and moving the
login-protection thresholds into the app.
