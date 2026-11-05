# CLAUDE.md

Project conventions for Claude Code sessions.

## Git

- Never run git commands that change history, branches, or the remote: no `commit`, `push`,
  `reset`, `rebase`, `merge`, `checkout`/`switch` to other branches, `branch`, `stash`, `tag`,
  `cherry-pick`. `git add` only when explicitly asked. The user commits.
- Read-only git (`status`, `diff`, `log`, `show`, `blame`) is fine.

## Docs

- Foundation design: `docs/superpowers/specs/2026-10-01-study-platform-foundation-design.md`.
  Read it before changing the schema or the progression rules.
- Content editor design: `docs/superpowers/specs/2026-11-04-content-editor-design.md`.
- Build log and open work: `docs/superpowers/plans/2026-10-01-study-platform-foundation.md`.

## Layout

- React Router v8 framework mode (SSR, middleware). The single route guard is
  `app/server/auth/middleware.server.ts` on `app/root.tsx`; public paths are the allowlist in
  `app/config/public-routes.ts`.
- `app/schemas/` zod schemas (client-safe). `app/shared/` pure helpers for both sides.
  `app/server/` server-only, one subfolder per domain (`auth/`, `content/`, `progress/`,
  `storage/`, `feedback/`). `app/components/`, `app/config/`, `app/i18n/`, `app/routes/`.
- `.server.ts` never reaches the client bundle; ESLint forbids importing it (or Prisma) from
  non-server files. Route modules are exempt. Server files under a domain are one per table
  (for example `content/admin/{subject,section,lesson}.server.ts`).
- Prisma 7 with `@prisma/adapter-mariadb`; `DATABASE_URL` is read in `prisma.config.ts`. Generated
  client: `prisma/generated/client/client`. After schema changes run `npm run db:migrate` and keep
  the migration file. `database.server.ts` holds the singleton and the Prisma error predicates.
- `env.server.ts` parses `process.env` through `/env.schema.ts` once.

## Single writers (do not bypass)

- `Lesson.content`: `saveLessonContent()` in `app/server/lesson-content.server.ts` (validates,
  checks assets, syncs `LessonAsset`; accepts a transaction client). Read with
  `parseLessonContent()`.
- `Lesson.draftContent`: `saveLessonDraft()` (syncs `LessonAsset` to live + draft assets).
- Subject / Section / Lesson structure: `app/server/content/admin.server.ts` (barrel over
  `content/admin/`).
- Publishing: `publishSubjects()` in `app/server/content/publish.server.ts`, one transaction per
  subject, then `sweepOrphanAssets()` deletes unreferenced uploads older than an hour.
- `LessonAttempt` / `LessonProgress`: `recordAttempt()` in `app/server/progress/attempts.server.ts`.
  Unlock rules only in `computeTree()` (`app/shared/unlock.ts`). `sortOrder` is not unique.
- `Suggestion`: `createSuggestion()` / `updateSuggestionStatus()` in
  `app/server/feedback/suggestions.server.ts` (daily throttle `SUGGESTIONS_MAX_PER_DAY`).
- Toasts: `setFlash()` / `flashFromContext()` in `app/server/flash.server.ts`; the root loader
  takes it with `takeFlash()` and `Toaster` renders it.

## Content rules

- Draft/publish: `Subject.isActive` plus `publishedAt` on Subject/Section/Lesson. Learner queries
  must filter `publishedAt != null`. Metadata edits and deletes go live immediately.
- Block renderers live in `app/components/lesson-content/blocks/` and are registered in
  `LessonContent.tsx`; the registry is exhaustive. New block type: schema → renderer → register.
- The block editor is `app/components/content-editor/`: `BlockEditor` (state, form, preview),
  `BlockCard`, one file per block type under `fields/`, `blocks.tsx` for shared constants.
- Direction: the shell is Hebrew RTL; content direction comes from `Subject.direction` with
  per-block `dir`. All UI strings go through `t()` in `app/i18n`.
- Storage goes through `StorageProvider` (`app/server/storage/`); uploads through
  `storeUploadedImage()` (magic-byte sniffing, `UPLOAD_MAX_BYTES`).
- Lessons without questions are completed by the "complete" intent on the lesson route (score 100).

## Auth rules

- argon2id passwords; DB sessions with a signed `__session` cookie; sliding expiry re-issues the
  cookie. `login()` and `register()` are the route entry points (they log to `AuthLog` and apply
  lockout, IP blocks and the registration throttle). Routes sign in with `replaceSession()`.
- The `"unknown"` IP sentinel is never blocked or throttled. Thresholds are env-backed in
  `app/server/security.server.ts`; the escalation table is a code constant.
- Roles are global: `USER` < `ADMIN` (`/admin`) < `SYSTEM_ADMIN` (`/system-admin`). Use
  `requireUser()` / `requireRole()` from `app/server/auth/context.server.ts` in every loader and
  action; each admin prefix also has a layout that enforces the role.

## UI

Design direction "transit line": the lesson path is a vertical rail with stations; signage-style
type (Heebo), flat saturated subject accents, strong ink, generous space.

- Styling is moving to **Tailwind v4 + shadcn** incrementally: new UI uses Tailwind classes and the
  components in `app/components/ui/` (added with `npx shadcn@latest add <name>`); existing pages keep
  their hand-written CSS in `app.css` until they are touched. Tailwind preflight is not imported.
  shadcn's theme variables are aliases of the tokens (the `@theme inline` block in `app.css`).
- Tokens live only in `app/styles/tokens.css`; never raw hex in component CSS or Tailwind classes.
- Forms stay React Router `<Form>` + server-side zod; shadcn primitives are used inside them, not
  react-hook-form. Shared form pieces live in `app/components/forms/` (`DateRangeFields` posts
  `from`/`to`; parse with `DateRangeQuerySchema`, resolve with `resolveDateRange()`).
- Tailwind: logical utilities only (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`), never `pl-`/`ml-`/`left-`.
- Theme: `<html data-theme="light|dark">` from the `theme` cookie; no attribute follows the system.
- Per-subject accent: set `--accent` inline from `resolveSubjectTheme(subject)`; icons come from
  the allowlist in `app/shared/subject-theme.ts` via `SubjectIcon`.
- Logical properties only (`inline-size`, `margin-inline-start`); mirrored icons get `.rtl-flip`.
- Shared pieces: `AppHeader`, `AuthPage` + `Field`, `SubjectCard`, `lesson-path/LessonPath`,
  `QuestionsPlaceholder`, `StubPage`.
- Self-hosted fonts (`--font-ui`, `--font-quote`); visible `:focus-visible` ring; motion respects
  `prefers-reduced-motion`. The empty `.rail__ad` slots on `/subjects` stay empty.

## Conventions

- No subject-specific names, strings, or logic outside `prisma/seed-data/`; `npm run lint` runs
  `scripts/check-no-subject-leakage.ts`. Extend its list when seeding a new subject.
- Full identifier names; no abbreviations (`ctx`, `req`, `v`, `i`). Generic `T` is the exception.
- New subject: data only. If it seems to need code, generalize the model instead.
- Forms validate with zod on the server and show field errors; no native browser validation.
- Tests live in `tests/` mirroring `app/`. DB tests call `resetDb()` against `study_test`
  (forced in `tests/setup.ts`; `npm run db:test:migrate` after migrations). Component tests opt
  into jsdom with `// @vitest-environment jsdom`. TDD: failing test first.
- Future hooks are `TODO(<feature>)`: `quiz`, `user-management`, `system-settings`,
  `cloud-storage`, `streaks`, `2fa`, `forum`, `suggestions-triage`.
- Run `npm run lint && npm run typecheck && npm test` before claiming work is done.
