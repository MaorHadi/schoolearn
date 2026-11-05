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

Rails beside the subject grid: Forum link (`/forum` is a `StubPage`, `TODO(forum)`), reserved ad
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

## Open work

- `TODO(quiz)`: question editor, quiz UI, answer submission through `recordAttempt()`.
- `TODO(forum)`: threads, replies, moderation. Needs its own spec.
- `TODO(suggestions-triage)`: status changes, filters, pagination on the system-admin list.
- `TODO(user-management)`, `TODO(system-settings)`: `/system-admin` pages.
- `TODO(streaks)`: attempt timestamps and `User.timezone` are ready.
- `TODO(2fa)`, `TODO(cloud-storage)`: reserved hooks.
- Editor follow-ups: stage metadata edits and deletes as drafts, materials editor, asset library,
  image dimension detection. Review leftovers (minor): ownership check of section/lesson ids
  against the page's subject, `hasPendingChanges` selecting full draft JSON, non-atomic
  `max(sortOrder)+1`, single `=` escaped in inline markup.
- Advertising: fill the `.rail__ad` slots when a provider is chosen; keep the reserved height.
