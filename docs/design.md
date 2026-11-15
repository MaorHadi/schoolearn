# Design

How the study platform works and why. The authoritative schema is `prisma/schema.prisma`; the
conventions for working in the code are in `CLAUDE.md`.

## 1. Purpose

A multi-subject study platform. A learner picks a subject and moves through ordered sections and
lessons; passing a lesson opens the next. Teachers build subjects in the app. Subjects are data:
nothing in `app/` may assume a particular one, and `scripts/check-no-subject-leakage.ts` (part of
`npm run lint`) enforces it. If a subject ever seems to need its own route, component or branch,
generalise the model instead.

## 2. Stack and conventions

- React Router v8 framework mode (loaders, actions, middleware), Vite, TypeScript strict.
- MariaDB through Prisma, in Docker Compose locally.
- Prisma and secrets only in `*.server.ts`; ESLint forbids importing those from client code.
- Client-safe code (zod schemas, roles, direction, unlock rules, i18n) has no Node or Prisma
  imports.
- The interface is Hebrew and right-to-left. Content direction belongs to the subject, with an
  optional override per block.
- `app/i18n/he.ts` is a flat key-to-string map read through `t()`. No library.
- Forms are React Router `<Form>` with zod validation on the server and errors shown per field.

## 3. Data model

```
Subject → Section → Lesson → Question → QuestionOption
```

- `User`: unique username, optional unique email, `passwordHash`, global `role`, `isDisabled`,
  `lockoutClearedAt`, `timezone`. The implicit many-to-many with `Subject` is enrollment.
- `Session`: required user (cascade), `expirationDate`, `lastActivity`, `ip`, and `sessionData`,
  which carries the flash toast.
- `AuthLog`: ip, free-text username (attempts on unknown names are recorded too), outcome, type.
- `IpBlock`: one row per address with `strikeCount`, `updatedAt` and `expiresAt`.
- `Subject`: slug, name, description, locale, direction, theme (accent colour, icon),
  `defaultPassingScore`, `isActive`, `publishedAt`. Listed alphabetically by name.
- `Section` / `Lesson`: `sortOrder` is indexed but not unique, so reordering is a plain update.
  A lesson holds `content`, `draftContent`, `draftQuestions`, `passingScore`, `publishedAt`.
- `LessonAsset`: which assets a lesson references. The asset side is `Restrict`, so a used asset
  cannot be deleted.
- `Question` / `QuestionOption`: the live quiz of a lesson.
- `Asset`: provider-relative `storageKey`, MIME type, size, dimensions, uploader.
- `LessonAttempt`: one row per try. `LessonProgress`: one row per user and lesson with
  `bestScore` and `completedAt`, which is set once and never cleared.
- `Suggestion`: a learner's improvement suggestion with a status.
- `SystemSetting`: one row per setting saved in the app.
- `Material`: schema only.

Roles are global per user: learners register themselves, and an administrator promotes accounts.

## 4. Progression and passing

The unlock rules live only in `computeTree()` (`app/shared/unlock.ts`). `recordAttempt()` is the
only writer of attempts and progress.

- The first lesson of the first section is always open. A lesson opens when the previous lesson
  in its section is completed. A section opens when every lesson of the previous one is
  completed.
- Passing score: the lesson's own `passingScore`, else its subject's `defaultPassingScore`, else
  `DEFAULT_LESSON_PASSING_SCORE` (`effectivePassingScore()`).
- `recordAttempt()` inserts the attempt and upserts progress in one transaction, with
  `bestScore = max(old, score)` and `completedAt` kept once set. The progress write is one atomic
  statement, so concurrent attempts cannot lose a higher score or a completion. Retakes never
  lock anything again, and neither does changing a passing score.
- `getSubjectTree()` computes `{ unlocked, completed, bestScore }` in memory from two queries. A
  locked lesson's loader answers 403.

## 5. Lesson content

- `app/schemas/content-blocks.ts` defines the blocks: `heading` (level 1–3), `paragraph` (rich
  text spans with bold, italic and highlight marks), `quote` (text, optional reference and source
  label, highlight ranges checked against the text length), `image` (`assetId`, required `alt`,
  caption) and `list` (ordered flag, rich-text items). Every block has an id and an optional
  `dir`.
- `parseLessonContent()` validates every read. `saveLessonContent()` is the only writer of
  `Lesson.content` and keeps `LessonAsset` in sync.
- `LessonContent` renders through a registry typed by block type, so a new block type fails the
  build until it has a renderer. Asset URLs are resolved in the loader.
- Adding a block type is schema, renderer, registration. No migration, because the union only
  grows.

## 6. Quiz

- Two question types: `MULTIPLE_CHOICE` (exactly one correct option) and `MULTIPLE_ANSWER` (one
  or more correct options, all or nothing). A question has 2–6 options; a lesson up to 50
  questions.
- The score is the whole percent of fully correct questions, computed only by `gradeQuiz()`
  (`app/shared/quiz.ts`).
- The lesson loader sends the questions without `isCorrect`. The answer key
  (`getLessonAnswerKey()`) is read only inside the action.
- The lesson route's `answer` intent takes one `questionId` per question shown and the chosen
  option ids as `question-<id>`. It
  - answers 409 when the posted question ids are not the live ones (a publish happened since the
    page loaded),
  - rejects an option that belongs to another question, or two options on a single-answer
    question,
  - answers 400 with the unanswered question ids, recording nothing,
  - otherwise grades, records the attempt, and returns the score, pass or fail, and per question
    whether it was right and which options were correct.
- The result is shown in place, read-only; "try again" reloads the page for a clean form.
  Retakes are unlimited.
- A lesson without questions is completed by the `complete` intent, which records a score of 100.
  That intent refuses an uncompleted lesson that has questions.

## 7. Draft and publish

Learners never see half-finished work. There is one set of tables plus "published" markers.

- A subject is visible when `isActive`. Sections and lessons are visible when `publishedAt` is
  set; every learner query filters on it. New sections and lessons start unpublished.
- Lesson text is edited as `draftContent` (`saveLessonDraft()`), and questions as
  `draftQuestions` (`saveQuestionsDraft()`). A draft that no longer passes its schema is reported
  as invalid and the editor falls back to the live version.
- `publishSubjects()` handles each subject in its own transaction: every content draft becomes
  `content` through `saveLessonContent()`, every question draft replaces the lesson's question
  rows through `saveLessonQuestions()`, drafts are cleared, unpublished sections and lessons get
  their `publishedAt`, and the subject becomes active. A subject with an invalid draft, or one
  that references a missing asset, is rolled back and reported; the others still publish.
- Publishing replaces question rows, so question and option ids change. An empty question draft
  removes the quiz.
- "Pending changes" means an inactive subject, an unpublished section or lesson, or a lesson with
  a content or question draft. The publish page lists exactly those subjects.
- Deliberate limit: titles, order, theme and deletes apply immediately. Staging every field
  would double the schema for little benefit.

### Editors

- The structure tree on the subject page renames, adds, deletes and reorders sections and
  lessons. Reordering is drag and drop, or the arrow keys on the grip; lessons stay inside their
  section. Each row is its own form, dispatched by `intent`.
- The block editor keeps the block list in React state, posts it as one JSON field, and previews
  it with the real renderers. Rich text is typed as plain markup (`**bold**`, `*italic*`,
  `==highlight==`, backslash escapes) and converted by `app/shared/inline-markup.ts`.
- The question editor works the same way: the list in state, one JSON field, and saving disabled
  until every question passes the schema.

## 8. Storage and uploads

- `StorageProvider` (`put`, `get`, `delete`, `publicUrl`) in `app/server/storage/`. The local
  provider writes under `STORAGE_LOCAL_DIR`; `routes/media.$.tsx` streams objects. A cloud
  provider is a new file plus one case in the factory (`TODO(cloud-storage)`).
- `storeUploadedImage()` reads the image type from the file's own bytes (PNG, JPEG, GIF, WebP),
  ignores the type the browser claims, and enforces the upload size setting. The declared body
  size is checked before the multipart body is read into memory.
- A draft's uploads are linked through `LessonAsset` (live plus draft assets), so
  `sweepOrphanAssets()`, which runs after publishing and deletes unreferenced uploads older than
  an hour, leaves them alone.

## 9. Auth and sessions

- Passwords are hashed with argon2id. Registration takes a username of 3–32 characters from
  `[a-zA-Z0-9_.-]`, an optional email, and a password of at least 8 characters.
- The `__session` cookie is httpOnly, `sameSite=lax`, secure in production, and signed with
  `SESSION_SECRET`. Expiry slides: when `lastActivity` is older than
  `SESSION_TOUCH_INTERVAL_MINUTES`, the row is extended and the cookie re-issued.
- One guard (`app/server/auth/middleware.server.ts`, on the root route): resolve the client
  address; answer 403 if it has an active block; let public paths through; otherwise load the
  session. A missing or expired session, or a disabled user, clears the cookie and redirects to
  the login page with a return address.
- Roles are `USER < ADMIN < SYSTEM_ADMIN`. Every loader and action calls `requireUser()` or
  `requireRole()` itself; the admin layouts check the role as well.

### Login protection

- Thresholds are environment variables read in `app/server/security.server.ts`: the failure
  window, failures per username and the lockout length, failures per address (validated to be
  higher than the username limit, because many students share one address), trusted proxy
  count, and log retention. The escalation table for address blocks (15 minutes, 1 hour, 6 hours,
  24 hours, with a 7-day lookback) is a constant in code: it is policy, not deployment tuning.
- Login: an active address block fails; too many username failures fail (`lockoutStateFor()` is
  the single lockout rule); the password is verified against a dummy hash when the user does not
  exist, to equalise timing; a failure is logged and may create or escalate an address block; a
  success is logged and creates the session. Every failure shows the same message.
- Registration is throttled per address, and can be closed entirely by a system setting.
- The client address is the socket address, or the N-th entry from the right of
  `X-Forwarded-For` when `TRUSTED_PROXY_COUNT > 0`. An address that cannot be determined is
  recorded as `unknown` and is never blocked or throttled.
- `npm run cleanup` removes expired blocks past the lookback and old log rows.

## 10. User management

`app/server/users/user.server.ts` is the only writer of `role`, `isDisabled` and
`lockoutClearedAt`.

- A system admin can search accounts, change a role, disable or enable an account (disabling
  ends its sessions), lift a username lockout, remove an address block, and read the login log
  for a date range.
- Two guards: never your own account, and never the last active system admin.
- Lifting a lockout sets `lockoutClearedAt`; failures before it stop counting. No log rows are
  deleted, so the audit trail stays whole. Removing an address block deletes its row, which also
  resets its escalation history.
- Accounts are not created, deleted or given new passwords from this page.

## 11. System settings

- `SystemSetting` holds one row per saved setting; a missing row means the default applies.
  `app/server/settings/settings.server.ts` is its only reader and writer.
- The settings are the teacher contact email, suggestions per user per day, registration open or
  closed, and the image upload size limit. Their defaults are `CONTACT_EMAIL`,
  `SUGGESTIONS_MAX_PER_DAY`, open, and `UPLOAD_MAX_BYTES`.
- `getSystemSettings()` resolves each key from its row and falls back to the default when the
  row is missing or its value no longer passes the schema. There is no cache.
- A saved value overrides its environment value from then on. Saving an empty contact email
  stores "none"; it does not return to the environment value.
- While registration is closed, `register()` refuses before the throttle and writes no log row,
  and the register page shows a notice instead of the form. The seed is not affected.
- Login-protection thresholds are deliberately not settings.

## 12. Seed

`prisma/seed.ts` upserts the system admin from `SEED_ADMIN_*`, stores one placeholder image, and
creates two published subjects from `prisma/seed-data/`: a Hebrew right-to-left subject with four
sections, and an English left-to-right one with a different shape, including a block with its
own direction. Three lessons carry a short quiz. The seed is idempotent by slug and `sortOrder`,
and never overwrites a password changed in the app.

## 13. Testing

Tests live in `tests/`, mirroring `app/`, and there are no end-to-end tests.

- Unit: schemas, direction, unlock rules on fixture trees, grading, ordering, inline markup,
  escalation maths, client address parsing, roles, date ranges.
- Database (against `study_test`, wiped before each test): registration, login, the guard,
  lockout, address blocks, sliding expiry, seed idempotence, attempt invariants, drafts,
  publishing, settings, user management.
- Routes: loaders and actions called directly with a router context, including the role checks.
- Components (jsdom): the editors, the quiz, the subject form, the structure tree.

## 14. Not built

- `TODO(streaks)`: attempt timestamps and `User.timezone` are already stored.
- `TODO(2fa)` and `TODO(cloud-storage)`: reserved places in the code.
- `TODO(suggestions-triage)`: filters and paging on the suggestions list.
- Email verification, password reset, creating or deleting accounts from the admin pages, more
  question types, per-question explanations, an attempt history for learners, staging of title
  and order edits, a materials editor, and an asset library.
- The empty advertising slots on the subjects page are reserved and stay empty.
