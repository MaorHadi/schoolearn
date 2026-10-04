# CLAUDE.md

Project conventions for Claude Code sessions.

## Git rules

- **Never run git commands that change history, branches, or the remote.** This
  includes `git commit`, `git push`, `git reset`, `git rebase`, `git merge`,
  `git checkout`/`git switch` to other branches, `git branch`, `git stash`,
  `git tag`, and `git cherry-pick`. The user handles all commits themselves.
- Read-only git commands are fine: `git status`, `git diff`, `git log`, `git show`,
  `git blame`.
- `git add` is also off limits unless the user explicitly asks for it.

## Architecture

Spec: `docs/superpowers/specs/2026-10-01-study-platform-foundation-design.md`.
Plan: `docs/superpowers/plans/2026-10-01-study-platform-foundation.md`. Read the spec before
changing the schema or the progression rules.

- **React Router v8 framework mode** (SSR, middleware on by default). The single route guard is
  `app/server/auth/middleware.server.ts`, registered on `app/root.tsx`. Public paths are the
  explicit allowlist in `app/config/public-routes.ts`; everything else requires a session.
- **Folder roles** under `app/`:
  - `schemas/` zod schemas and inferred types, client-safe (`content-blocks.ts`, `auth.ts`).
  - `shared/` pure helpers used on both sides (`roles.ts`, `direction.ts`, `unlock.ts`).
  - `server/` server-only modules; subfolders by domain (`auth/`, `content/`, `progress/`,
    `storage/`). `database.server.ts` is the Prisma singleton; `env.server.ts` parses
    `process.env` through `/env.schema.ts` once.
  - `components/` React components. `config/` static config. `i18n/` UI strings. `routes/`.
- **`.server.ts` suffix** marks code that must never reach the client bundle. ESLint forbids
  importing it (and Prisma) from non-server files; route modules are exempt because React Router
  strips loaders/actions/middleware from the client.
- **Prisma 7** with `@prisma/adapter-mariadb`. `DATABASE_URL` is read in `prisma.config.ts`, not
  the schema. Generated client: `prisma/generated/client/client`. After schema changes run
  `npm run db:migrate` (which regenerates) and keep the migration file.
- **Lesson content** is a JSON block array. Read via `parseLessonContent()`, write via
  `saveLessonContent()` (validates, checks assets exist, syncs `LessonAsset`). Never write
  `Lesson.content` directly. Renderers live in `app/components/lesson-content/blocks/` and are
  registered in `LessonContent.tsx`; the registry is exhaustive over the block union.
- **Direction:** UI shell is Hebrew RTL (`<html dir="rtl">`); content direction comes from
  `Subject.direction` with optional per-block `dir`. All UI strings go through `t()` in `app/i18n`.
- **Progression:** `computeTree()` in `app/shared/unlock.ts` is the only place unlock rules live.
  `recordAttempt()` in `app/server/progress/attempts.server.ts` is the only writer of
  `LessonAttempt` and `LessonProgress`. `sortOrder` is not unique; sort in queries.
- **Auth:** argon2id passwords; DB-backed sessions with a signed `__session` cookie; sliding expiry
  re-issues the cookie when extended. `login()` (not `authenticate()`) is the entry point from
  routes: it logs to `AuthLog`, applies username lockout and per-IP blocks. `register()` (not
  `registerUser()`) is the entry point for sign-up: it logs with type `register` and applies the
  per-IP registration throttle. Routes log users in with `replaceSession()`, which deletes any
  session the request already carries. The `"unknown"` IP sentinel is never blocked or throttled. Thresholds are env-backed in `app/server/security.server.ts`; the
  escalation table is a code constant.
- **Roles** are global per user: `USER` < `ADMIN` (`/admin`, content) < `SYSTEM_ADMIN`
  (`/system-admin`, users and settings). Use `requireUser()` / `requireRole()` from
  `app/server/auth/context.server.ts` in loaders and actions. Each admin prefix has its own layout
  that enforces the role.
- **Storage** goes through `StorageProvider` (`app/server/storage/`); only `local` exists.

## Conventions

- **No subject-specific names, strings, or logic outside `prisma/seed-data/`.** `npm run lint`
  runs `scripts/check-no-subject-leakage.ts`, which fails on forbidden tokens in `app/`. Extend its
  list when seeding a new subject.
- **Full identifier names.** No one-letter or abbreviated variable or parameter names (`ctx`,
  `req`, `v`, `i`). Generic type parameters like `T` are the exception.
- New block type: schema → renderer → register. No migration.
- New subject: data only. If it seems to need code, generalize the model instead.
- Tests live in `tests/` mirroring `app/`. DB tests call `resetDb()` and run against the separate
  `study_test` database (forced in `tests/setup.ts`; `npm run db:test:migrate` after migrations).
  Never point tests at the seeded dev database.
  Component tests opt into jsdom with `// @vitest-environment jsdom`. TDD: failing test first.
- Future hooks are marked `TODO(<feature>)`: `quiz`, `content-editor`, `user-management`,
  `system-settings`, `cloud-storage`, `streaks`, `2fa`, `subjects`.
- Run `npm run lint && npm run typecheck && npm test` before claiming work is done.
