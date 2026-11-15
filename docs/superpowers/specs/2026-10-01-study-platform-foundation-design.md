# Study Platform Foundation — Design

Date: 2026-10-01. Status: implemented (see `docs/superpowers/plans/2026-10-01-study-platform-foundation.md`).

## 1. Purpose

A general, multi-subject web study platform replacing a single-subject Android quiz app. Users
pick a subject and progress through ordered sections and lessons, Duolingo-style. Subjects are
pure seed data; nothing in `app/` may assume a particular one.

This design covers the foundation: schema, auth, sessions, route guard, brute-force protection,
lesson content model and renderer, progression, seed, tooling. Quiz UI, gamification, streaks,
2FA and the content editor were out of scope (the editor has its own spec, 2026-11-04).

Legacy app, for reference: chapter summaries and full text as external links, a multiple-choice
quiz from a flat Firebase node (`question`, comma-joined `options`, 0-based `answer`), and a
phone gimmick. Only the question shape matters, for a possible future import
(`question -> prompt`, options -> four `QuestionOption` rows, `answer` -> `isCorrect`). The bank
is not in the repository.

## 2. Stack and conventions

- React Router v8 framework mode (loaders, actions, middleware), Vite, TypeScript strict.
- MariaDB via Prisma (`provider = "mysql"`), local Docker Compose.
- Prisma and secrets only in `*.server.ts`; ESLint forbids importing those from client code.
- Client-safe code (zod schemas, roles, direction, unlock rules, i18n) in plain `.ts` with no Node
  or Prisma imports.
- UI is Hebrew RTL; content direction is a property of the subject with per-block override.
- `app/i18n/he.ts` is a flat key→string map; `t(key)` returns it. No library.
- Folder roles are documented in `CLAUDE.md` (`schemas/`, `shared/`, `server/`, `components/`,
  `config/`, `i18n/`, `routes/`).

## 3. Schema

The authoritative schema is `prisma/schema.prisma`. Decisions behind it:

- `User`: unique username, optional unique email, `passwordHash`, global `role`, `isDisabled`,
  `timezone` (for future streaks). Implicit m:n `subjects` is enrollment.
- `Session`: cuid id, required `userId` (cascade), `expirationDate`, `lastActivity`, `ip`,
  `sessionData` Json (holds the flash toast).
- `AuthLog`: ip, free-text username (so attempts on unknown names are recorded), outcome, type.
- `IpBlock`: one row per IP, `strikeCount`, `updatedAt` (escalation lookback), `expiresAt`.
- `Subject`: slug, name, description, locale, direction, `isActive`, `publishedAt`. Listed
  alphabetically by name (no `sortOrder`).
- `Section` / `Lesson`: `sortOrder` indexed, not unique, so reordering is a plain update.
  `Lesson.content` is the block array; `draftContent` and `publishedAt` came with the editor.
- `LessonAsset`: which assets a lesson references; `Restrict` on the asset side so a used asset
  cannot be deleted. Maintained by `saveLessonContent()` and `saveLessonDraft()`.
- `Question` / `QuestionOption` (`QuestionType` enum, extensible): the live quiz of a lesson,
  see `2026-11-15-quiz-design.md`. `Material`: schema only.
- `Asset`: unique provider-relative `storageKey`, MIME type, size, dimensions, uploader.
- `LessonAttempt`: one row per try. `LessonProgress`: unique per user and lesson, `bestScore`,
  `completedAt` set once and never cleared.

Roles are global per user by design: one admin account manages content; learners self-register.

## 4. Progression

Rules live only in `app/shared/unlock.ts`; `recordAttempt()` is the only writer of attempts and
progress.

- Lesson 1 of section 1 is always unlocked. Lesson n is unlocked when lesson n-1 in the same
  section is completed. Section k is unlocked when every lesson of section k-1 is completed.
- Passing: `score >= lesson.passingScore ?? subject.defaultPassingScore ??
DEFAULT_LESSON_PASSING_SCORE`.
- `recordAttempt(userId, lessonId, score)` in one transaction inserts the attempt and upserts
  progress with `bestScore = max(old, score)` and `completedAt = completedAt ?? (passed ? now)`.
  Retakes never re-lock anything.
- `getSubjectTree()` computes `{ unlocked, completed, bestScore }` in memory from two queries.
  A locked lesson's loader returns 403. Lessons without questions are completed by the
  "complete" intent on the lesson route (score 100); lessons with questions by the "answer"
  intent, which grades the quiz.

## 5. Lesson content

- `app/schemas/content-blocks.ts`: `heading` (level 1–3), `paragraph` (rich text spans with
  bold/italic/highlight marks), `quote` (text, optional reference and source label, highlight
  ranges validated against the text length), `image` (`assetId`, required `alt`, caption),
  `list` (ordered flag, rich-text items). Every block has an id and an optional `dir`.
- `parseLessonContent()` validates every read; `saveLessonContent()` is the only writer of
  `Lesson.content` and syncs `LessonAsset`.
- `LessonContent` renders through a registry typed as `Record<ContentBlock["type"], FC>`, so a
  new block type fails the build until it has a renderer. Asset URLs are resolved in the loader.
- Adding a block type: schema → renderer in `components/lesson-content/blocks/` → register. No
  migration, because the union only grows.

## 6. Storage

`StorageProvider` (`put`, `get`, `delete`, `publicUrl`) in `app/server/storage/`. The local-disk
provider writes under `STORAGE_LOCAL_DIR` with a sidecar MIME file; `routes/media.$.tsx` streams
objects. `getStorage()` picks the provider from `STORAGE_PROVIDER`; a cloud provider is a new file
plus one factory case (`TODO(cloud-storage)`).

## 7. Auth, sessions, guard

- Passwords: argon2id. Registration: username 3–32 chars `[a-zA-Z0-9_.-]`, optional email,
  password min 8; duplicates return the same generic message.
- Session cookie `__session`: httpOnly, `sameSite=lax`, secure in production, signed with
  `SESSION_SECRET`. Sliding expiry: when `lastActivity` is older than
  `SESSION_TOUCH_INTERVAL_MINUTES`, extend the row and re-issue the cookie.
- Guard (`app/server/auth/middleware.server.ts`, on the root route): resolve client IP → 403 if an
  active `IpBlock` exists → pass through public paths → load the session; missing, expired or
  disabled user deletes the row, clears the cookie and redirects to `/login?redirectTo=` →
  touch expiry and set `userContext`.
- Roles: `USER < ADMIN < SYSTEM_ADMIN` (`app/shared/roles.ts`); `requireRole()` throws 403.

## 8. Brute-force protection

Env-backed thresholds in `app/server/security.server.ts` (documented in `.env.example`):
failure window, per-username max and lockout, per-IP max (validated greater than the username
max), trusted proxy count, log retention. In code: `IP_BLOCK_ESCALATION_MINUTES = [15, 60, 360,
1440]`, lookback 7 days.

Login: active IpBlock → fail; username failures over the limit → fail; verify the hash (against a
dummy hash when the user is missing, to equalise timing); on failure log it and, when the IP's
failures reach the limit, upsert its `IpBlock` with the strike count escalating in place; on
success log and create the session. Every failure shows the same message. The `"unknown"` IP
sentinel is never blocked. Client IP: socket address, or the N-th entry from the right of
`X-Forwarded-For` when `TRUSTED_PROXY_COUNT > 0`. `cleanupSecurityTables()` (`npm run cleanup`)
removes expired blocks past the lookback and old logs.

## 9. Seed

`prisma/seed.ts` upserts the SYSTEM_ADMIN from `SEED_ADMIN_*`, copies a placeholder PNG into
storage as one `Asset`, and creates two published subjects from `prisma/seed-data/`: a Hebrew RTL
subject with four sections, and an English LTR demo with a different shape (including one block
with `dir: "rtl"`). Idempotent by slug and sortOrder. Subject content lives only under
`prisma/seed-data/`; `scripts/check-no-subject-leakage.ts` enforces it.

New subjects are created in the admin editor (2026-11-04 spec). If a subject ever seems to need
its own route, component or branch in `app/`, generalise the model instead.

## 10. Testing

Unit: block schema, direction, unlock rules on fixture trees, escalation math, client IP parsing,
roles. DB (against `study_test`, `resetDb()` per test): register, login, guard, lockout, IP block,
sliding expiry, seed idempotence, `recordAttempt` invariants. No end-to-end tests.

## 11. Reserved hooks

`TODO(cloud-storage)`,
`TODO(streaks)`, `TODO(2fa)`, `TODO(suggestions-triage)`. Email verification,
password reset and an explicit Enrollment table are not planned yet.
