# Study Platform — build log

What has shipped, stage by stage, and what is still open. The design behind each stage is in
`docs/superpowers/specs/`. Verify any stage with `npm run lint && npm run typecheck && npm test`.

Rules that applied throughout: TDD (failing test first), the user commits (no history-changing git
commands), no subject-specific code outside `prisma/seed-data/`, all UI strings through `t()`.

## Stage 1 — Project setup (done)

React Router v8 framework mode, Vite, TypeScript strict, ESLint flat config + Prettier,
`scripts/check-no-subject-leakage.ts`, Docker Compose MariaDB on port 3307, `env.schema.ts`
validated at startup, `.env.example`.

## Stage 2 — Schema (done)

`prisma/schema.prisma` with Prisma 7 + `@prisma/adapter-mariadb`; `app/server/database.server.ts`
singleton. Tables: User, Session, AuthLog, IpBlock, Subject, Section, Lesson, LessonAsset, Question,
QuestionOption, Material, Asset, LessonAttempt, LessonProgress (later: Suggestion).

## Stage 3 — Auth and sessions (done)

argon2id passwords; DB-backed sessions with a signed `__session` cookie and sliding expiry;
`register()` / `login()` services; `app/i18n` with `t()`; `/login`, `/register`, `/logout`.

## Stage 4 — Guard and brute-force protection (done)

`app/server/auth/middleware.server.ts` on the root route; public allowlist in
`app/config/public-routes.ts`; `requireUser()` / `requireRole()`; trusted-proxy client IP;
username lockout and per-IP escalating blocks (`app/server/security.server.ts`); `npm run cleanup`.
Accepted deviation: `react-router-serve` does not expose the socket IP, so with
`TRUSTED_PROXY_COUNT=0` the IP is `"unknown"` and IP blocking is off (never blocked, still logged).

## Stage 5 — Content blocks and rendering (done)

`app/schemas/content-blocks.ts` (heading, paragraph, quote, image, list; per-block `dir`),
`app/server/lesson-content.server.ts` (`parseLessonContent`, `saveLessonContent`), renderers in
`app/components/lesson-content/` with an exhaustive registry, lesson page with error boundary.

## Stage 6 — Progression and storage (done)

`computeTree()` in `app/shared/unlock.ts`; `recordAttempt()` as the only writer of attempts and
progress; `StorageProvider` with the local-disk provider and the `/media/*` route.

## Stage 7 — Seed, subject pages, docs (done)

Idempotent seed with two subjects (Hebrew RTL, English LTR demo); subject picker, subject tree,
lesson page; README and CLAUDE.md.

## Stage 8 — Subjects page shell (2026-11-04, done)

Rails beside the subject grid (a forum link stood here until the forum was dropped): reserved ad
slots (keep empty), Suggestions form writing `Suggestion` through `createSuggestion()` with a
per-user daily throttle, teacher contact `mailto:` to `CONTACT_EMAIL`. `/system-admin/suggestions`
lists them.

### Stage 8b — Next-lesson button and toasts (done)

`LessonNext` completes a question-less lesson with `intent=complete` (full-score attempt) and
moves to the next lesson in path order. Toasts via `app/server/flash.server.ts` and `Toaster`.

## Stage 9 — Admin content editor with draft/publish (2026-11-04, done)

Spec: `docs/superpowers/specs/2026-11-04-content-editor-design.md`.

- Schema: `publishedAt` on Subject/Section/Lesson, `Lesson.draftContent`, `Subject.isActive`
  defaults to false; migration `content_publishing` backfills existing rows as published.
- Server: `app/server/content/admin.server.ts` (barrel over `admin/{subject,section,lesson}`),
  `publish.server.ts` (per-subject transactions, failure report, orphan-asset sweep),
  `app/server/storage/upload.server.ts` (sniffed uploads, `UPLOAD_MAX_BYTES`),
  `app/server/storage/sweep.server.ts`.
- Routes under `/admin`: subject list, new/edit subject with the section/lesson tree, lesson block
  editor (`app/components/content-editor/`) with live preview, drag-and-drop ordering and uploads,
  multi-subject publish page.
- Shared: `app/schemas/admin-content.ts`, `app/shared/inline-markup.ts`, `app/shared/ordering.ts`.

## Stage 10 — User management and the Tailwind/shadcn adoption (2026-11-05, done)

Spec: `docs/superpowers/specs/2026-11-05-user-management-design.md`.

- Schema: `User.lockoutClearedAt`, index on `User.createdAt`; migration `user_management`.
- Server: `app/server/users/user.server.ts` (list/search/paging, role, disable with session
  purge, lockout clear), `lockoutStateFor()` in `auth-log.server.ts`, `clearIpBlock()`.
  Security fix: the system-admin suggestions loader/action now call `requireRole` themselves.
- Routes: `/system-admin/users` (search, pager, pills) and `/system-admin/users/:id` (account,
  security, login log for a date range).
- UI stack: Tailwind v4 + shadcn adopted incrementally (see CLAUDE.md "UI"); first shared piece
  `app/components/forms/DateRangeFields.tsx` with `DateRangeQuerySchema` / `resolveDateRange()`.

## Stage 11 — Admin form polish and the quiz (2026-11-15, done)

Spec: `docs/superpowers/specs/2026-11-15-quiz-design.md`.

- Subject form: content language is a dropdown (`app/shared/content-locales.ts`), icons are
  picked from a grid of the icons themselves, `Subject.sortOrder` is dropped (migration
  `drop_subject_sort_order`) and subjects are listed alphabetically.
- Structure tree: sections and lessons reorder by drag and drop (`reorder-section` /
  `reorder-lesson` intents, `moveToPositionOf()`); the drag hook is shared with the block editor
  (`app/components/content-editor/useDragOrder.ts`).
- Quiz: migration `quiz` (`QuestionType.MULTIPLE_ANSWER`, `Lesson.draftQuestions`),
  `app/schemas/questions.ts`, `app/shared/quiz.ts`, `app/server/lesson-questions.server.ts`,
  `app/server/content/admin/question.server.ts`, question drafts in `publish.server.ts`, the
  `answer` intent and `QuizRunner` on the lesson page, the question editor at
  `/admin/lessons/:lessonId/questions`, seeded quizzes on three lessons.
- `prisma migrate dev` does not run non-interactively; these migrations were generated with
  `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` and
  applied with `npm run db:deploy`.

## Stage 12 — Forum removed, system settings, subject passing score (2026-11-15, done)

Spec: `docs/superpowers/specs/2026-11-15-system-settings-design.md`.

- The forum stub (route, nav link, rail card, strings) and `StubPage` are removed.
- Migration `system_settings`: table `SystemSetting`, column `Subject.defaultPassingScore`.
- `app/server/settings/settings.server.ts` and `/system-admin/settings`: contact email,
  suggestions per day, registration open/closed, upload size limit; `.env` values are defaults.
- `effectivePassingScore(lesson, subject)`; the subject form edits the subject default.

## Open work

- Quiz follow-ups: more question types, per-question explanations, attempt history for learners.
- `TODO(suggestions-triage)`: status changes, filters, pagination on the system-admin list.
- User management follow-ups: forced password reset on next login, create/delete accounts,
  migrate the user pages fully to shadcn components.
- `TODO(streaks)`: attempt timestamps and `User.timezone` are ready.
- `TODO(2fa)`, `TODO(cloud-storage)`: reserved hooks.
- Editor follow-ups: stage metadata edits and deletes as drafts, materials editor, asset library,
  image dimension detection. Review leftovers (minor): ownership check of section/lesson ids
  against the page's subject, `hasPendingChanges` selecting full draft JSON, non-atomic
  `max(sortOrder)+1`, single `=` escaped in inline markup.
- Advertising: fill the `.rail__ad` slots when a provider is chosen; keep the reserved height.
