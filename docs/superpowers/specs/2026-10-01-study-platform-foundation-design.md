# Study Platform Foundation — Design Spec

Date: 2026-10-01
Status: awaiting user review

## 1. Purpose

Rebuild the legacy "Biblearn" Android app (a Hebrew Genesis study app for a high
school test) as a general, multi-subject web study platform. Users pick a subject
and progress through ordered sections and lessons, Duolingo-style. The Bible
(Genesis) is the first subject and is represented purely as seed data; nothing in
the code may assume it.

This spec covers the **foundation only**: schema, auth, sessions, route guard,
brute-force protection, lesson content model and renderer, progression/unlock
logic, seed, tooling, and documentation. Quiz UI, question content, gamification,
streaks, content editors, 2FA, and visual polish are out of scope and are stubbed
with TODOs.

## 2. Legacy app summary (what we are replacing)

- Four features: chapter summaries (external Google Drive links), full chapter
  text (external snunit.k12.il links), a multiple-choice practice quiz fed from a
  flat Firebase node `questionsDB`, and a phone-number/SMS/TTS gimmick.
- Thirteen Genesis chapters: יב, יג, טו, טז, יח, כא, כב, כג, כד, כה, כז, כח, כט.
- Question shape: `question`, `options` (comma-joined, 4 items), `answer` (0-based).
- The question bank is **not in the repository**; it exists only in Firebase and
  may be exported later as a separate step. No placeholder questions are seeded.
- Everything else (Firebase, SMS, TTS, airplane receiver, external links) is dropped.

## 3. Stack and global conventions

- React Router v8, framework mode (loaders/actions/middleware), Vite, TypeScript `strict`.
- MariaDB via Prisma (`provider = "mysql"`), run locally with Docker Compose.
- All Prisma access and secrets live in `*.server.ts` modules. Nothing under
  `app/server/**/*.server.ts` may be imported from a client component.
- Shared, environment-agnostic code (block schemas, i18n keys, role constants)
  lives in plain `.ts` files and must not import Prisma or Node APIs.
- UI language: Hebrew, `dir="rtl"` on `<html>`. Content direction is a property of
  the **subject** (see §7), with optional per-block override.
- A minimal translation layer: `app/i18n/he.ts` exports a flat key→string object and
  `t(key)` returns it. No library. Adding a language = adding a file and a switch.
- ESLint (typescript-eslint, react, react-hooks, an import-boundaries rule
  forbidding `.server` imports from non-server files) + Prettier.
- `CLAUDE.md` at repo root records these conventions for future prompts.

## 4. Folder structure

Files are grouped by role, not dumped under a generic `lib/`. The `.server.ts` suffix still
marks every module that must never reach the client bundle.

```
env.schema.ts                    # zod schema for .env (pure); lives next to .env / .env.example
app/
  root.tsx                       # <html lang="he" dir="rtl">, registers the auth middleware
  routes.ts                      # route tree; public vs guarded
  entry.server.tsx / entry.client.tsx
  app.css
  schemas/                       # zod schemas + inferred types, client-safe
    content-blocks.ts            # lesson content block union
    auth.ts                      # Register/Login schemas, LoginFailureReason
  shared/                        # pure helpers used on both sides, client-safe
    roles.ts                     # Role, ROLE_RANK, hasRole()
    direction.ts                 # TextDirection, resolveDirection()
    unlock.ts                    # (Stage 6) computeTree(), isLessonUnlocked()
  config/
    public-routes.ts             # explicit public allowlist
  i18n/
    he.ts, index.ts              # UI strings and t()
  server/                        # server-only modules
    env.server.ts                # parses process.env through /env.schema.ts once
    database.server.ts           # Prisma client singleton
    security.server.ts           # brute-force thresholds (env) + escalation table (code)
    lesson-content.server.ts     # parse/serialize Lesson.content
    auth/
      password.server.ts, session.server.ts, login.server.ts, register.server.ts
      client-ip.server.ts, auth-log.server.ts, ip-block.server.ts, cleanup.server.ts
      context.server.ts          # userContext, requireUser(), requireRole()
      middleware.server.ts       # the route guard
    content/                     # (Stage 7) subjects, lessons queries
    progress/                    # (Stage 6) unlock.server.ts, attempts.server.ts
    storage/                     # (Stage 6) StorageProvider, local-disk, assets
  components/
    lesson-content/              # LessonContent dispatcher, RichText, blocks/*
    QuestionsPlaceholder.tsx
  routes/
    home.tsx                     # redirects to /subjects
    public/                      # login, register, logout
    app/                         # layout (any user), subjects, subject tree, lesson page
    admin/                       # layout (ADMIN+), content editor stub
    system-admin/                # layout (SYSTEM_ADMIN), settings stub, users stub
    media.$.tsx                  # streams stored assets at /media/*
prisma/
  schema.prisma, seed.ts, seed-lib.ts, seed-data/
scripts/
  cleanup.ts, check-no-subject-leakage.ts
tests/                           # mirrors app/; helpers/db.ts has resetDb + requestWithCookie
```

## 5. Prisma schema

The authoritative schema is `prisma/schema.prisma`; this section records the design and the
decisions behind it. Revised after Stage 6 (see "Schema hardening" below).

- `User`: username (unique), optional unique email, `passwordHash`, `role`, `isDisabled`,
  `timezone` (default `Asia/Jerusalem`, for future streaks), timestamps. Implicit m:n
  `subjects` is enrollment.
- `Session`: `id` cuid, **required** `userId` (cascade), `expirationDate`, `lastActivity`,
  `ip`, `sessionData` Json. Indexed on `userId` and `expirationDate`.
- `AuthLog`: ip, username (free text, so attempts against unknown names are recorded),
  `isSuccessful`, `failureReason`, `type`. Indexed on `(ipAddress, createdAt)` and
  `(username, createdAt)`.
- `IpBlock`: **one row per IP** (`ipAddress` unique), `strikeCount`, `createdAt`,
  `updatedAt` (drives escalation lookback and cleanup), `expiresAt`.
- `Subject`: slug, name, description, `locale`, `direction` (rtl|ltr), `isActive`,
  `sortOrder`, timestamps.
- `Section`: subject, title, `sortOrder`, timestamps. `sortOrder` is **indexed, not unique**,
  so reordering is a plain update.
- `Lesson`: section, title, `sortOrder` (indexed, not unique), `passingScore?`,
  `content` Json (block array), timestamps.
- `LessonAsset` (`lessonId`, `assetId`): which assets a lesson's content references.
  Maintained by `saveLessonContent()` on every write. `onDelete: Restrict` on the asset side,
  so a used asset cannot be deleted; cascade from the lesson side.
- `Question`: lesson, `type` (`QuestionType`, default `MULTIPLE_CHOICE`, extensible), prompt,
  `sortOrder`. `QuestionOption`: text, `isCorrect`, `sortOrder`. Schema only in this phase.
- `Material`: optional lesson attachment (`FILE | LINK | TEXT`), optional asset.
- `Asset`: `storageKey` (unique, provider-relative), mimeType, byteSize, dimensions, uploader.
- `LessonAttempt`: one row per try (`score`, `passed`, `createdAt`), indexed on
  `(userId, createdAt)` for streaks and `(userId, lessonId)`.
- `LessonProgress`: unique per `(userId, lessonId)`, `bestScore`, `completedAt` (set once,
  never cleared), `updatedAt`.

### Schema hardening (after Stage 6)

Decisions taken on review before any real content existed:

1. Sliding expiry re-issues the session cookie when the server-side expiry is extended
   (code change in the middleware; previously only the DB row slid).
2. `LessonAsset` join table added so image references inside lesson JSON have integrity.
3. `sortOrder` uniqueness dropped on `Section` and `Lesson` (indexed instead).
4. `Session.userId` made required.
5. `Question.type` added with the `QuestionType` enum.
6. `createdAt`/`updatedAt` added to `Subject`, `Section`, `Lesson`.

Roles stay global per user by design: a single admin account manages content; regular
accounts are self-created learners.

Legacy question mapping for a future import: `question -> prompt`, split `options` into
four `QuestionOption` rows, `answer` index -> `isCorrect`.

## 6. Progression and unlock rules

Implemented in `app/shared/unlock.ts` (pure rules), `app/server/progress/unlock.server.ts` and `attempts.server.ts`.

- Lesson 1 of Section 1 is always unlocked.
- Lesson n (n > 1) in a section is unlocked when lesson n-1 in the same section has
  `LessonProgress.completedAt` set for the user.
- Section k (k > 1) is unlocked when **every** lesson in section k-1 is completed.
  Its first lesson is then unlocked.
- Passing: `score >= (lesson.passingScore ?? env.DEFAULT_LESSON_PASSING_SCORE)`.
- `recordAttempt(userId, lessonId, score)` runs in a transaction: insert
  `LessonAttempt`; upsert `LessonProgress` with `bestScore = max(old, score)` and
  `completedAt = completedAt ?? (passed ? now : null)`. Retakes can only raise
  `bestScore` and never clear `completedAt`, so nothing ever re-locks.
- `getSubjectTree(userId, subjectId)` returns sections -> lessons with
  `{ unlocked, completed, bestScore }` computed in memory from two queries
  (lessons for the subject, the user's progress rows). This feeds the subject page.
- Guard: the loader for a locked lesson returns 403 with a translated message.
- The lesson page renders `<QuestionsPlaceholder />` and a disabled action stub
  (`TODO: submit answers -> recordAttempt`). There is no way to pass a lesson in
  this phase; that is intentional.

## 7. Lesson content blocks

### 7.1 Block schema (`app/schemas/content-blocks.ts`, shared)

```ts
const Direction = z.enum(["rtl", "ltr"]);
const InlineMark = z.enum(["bold", "italic", "highlight"]);
const InlineSpan = z.object({ text: z.string(), marks: z.array(InlineMark).default([]) });
const RichText = z.array(InlineSpan);

const Base = z.object({ id: z.string(), dir: Direction.optional() }); // dir = per-block override

export const HeadingBlock = Base.extend({
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string(),
});
export const ParagraphBlock = Base.extend({ type: z.literal("paragraph"), content: RichText });
export const QuoteBlock = Base.extend({
  type: z.literal("quote"),
  text: z.string(),
  reference: z.string().optional(), // e.g. a chapter/verse, "Magna Carta s.39", "Frost, 1916"
  sourceLabel: z.string().optional(), // e.g. "Verse", "Primary source", "Poem"
  highlights: z
    .array(z.object({ start: z.number().int().min(0), end: z.number().int() }))
    .default([]),
});
export const ImageBlock = Base.extend({
  type: z.literal("image"),
  assetId: z.number().int(),
  alt: z.string().min(1),
  caption: z.string().optional(),
});
export const ListBlock = Base.extend({
  type: z.literal("list"),
  ordered: z.boolean(),
  items: z.array(RichText),
});

export const ContentBlock = z.discriminatedUnion("type", [
  HeadingBlock,
  ParagraphBlock,
  QuoteBlock,
  ImageBlock,
  ListBlock,
]);
export const LessonContent = z.array(ContentBlock);
export type ContentBlock = z.infer<typeof ContentBlock>;
```

- `app/server/lesson-content.server.ts` exposes `parseLessonContent(json)` (throws a typed
  error on invalid stored data) and `serializeLessonContent(blocks)`; every DB read
  and write of `Lesson.content` goes through them, including the seed.
- Direction: `resolveDirection(subject.direction, block.dir)` returns the block
  override if present, else the subject direction. `LessonContent` wraps output in
  `<div dir={subjectDir}>` and each block renderer sets `dir` only when overridden.

### 7.2 Renderer

`LessonContent({ blocks, direction, assetUrls })` maps over blocks and dispatches via
a `Record<ContentBlock["type"], React.FC<...>>` registry. TypeScript's exhaustiveness
check on the record ensures a new union member cannot ship without a renderer.
Image blocks resolve `assetId` to a URL through the storage provider's `publicUrl()`
in the loader (not in the component), passed down as an `assetUrls` map.

### 7.3 Adding a new block type (worked example, not implemented)

To add a `table` block for a future subject:

1. In `blocks.ts`, define
   `TableBlock = Base.extend({ type: z.literal("table"), header: z.array(z.string()).optional(), rows: z.array(z.array(RichText)) })`
   and add it to the `discriminatedUnion` list.
2. Create `components/lesson-content/blocks/Table.tsx`.
3. Register it in the dispatcher record. The build fails until this is done.
4. Add i18n keys only if the block has UI chrome (e.g. an "expand" label).
5. No migration: `Lesson.content` is JSON. Existing lessons stay valid because the
   union only grew.

A `formula` block (`{ type: "formula", latex: string, display: boolean }`) follows
the same steps, plus a client-only renderer dependency loaded lazily in its
component so the core bundle is unaffected.

## 8. Storage

```ts
interface StorageProvider {
  put(key: string, data: Buffer, meta: { mimeType: string }): Promise<void>;
  get(key: string): Promise<{ stream: ReadableStream; mimeType: string } | null>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string; // local: /media/<key>
}
```

`local-disk.server.ts` writes under `env.STORAGE_LOCAL_DIR` (default `./storage`),
and the resource route `routes/media.$.tsx` streams files with the stored MIME
type. `getStorage()` picks the provider from `STORAGE_PROVIDER` (only `local` now).
A cloud provider is a new file implementing the interface plus one case in the
factory. Upload UI is out of scope; the seed inserts `Asset` rows pointing at a
bundled placeholder PNG copied into the storage dir.

## 9. Auth, sessions, guard

- **Passwords**: argon2id via the `argon2` package.
- **Registration**: username (3-32 chars, `[a-zA-Z0-9_.-]`), optional email,
  password (min 8). Duplicate username or email returns the same generic
  "registration failed" message.
- **Session**: on login, insert `Session { expirationDate = now + SESSION_EXPIRY_HOURS,
ip, sessionData: {} }`. Cookie `__session`: httpOnly, `secure` when
  `NODE_ENV=production`, `sameSite=lax`, path `/`, signed with `SESSION_SECRET`
  via React Router's `createCookie`. Sliding expiry: when `lastActivity` is older
  than `SESSION_TOUCH_INTERVAL_MINUTES` (default 5), update `lastActivity` and push
  `expirationDate` forward by the full expiry. Logout deletes the row and clears
  the cookie.
- **Guard** (`app/server/auth/middleware.server.ts`, registered on the root route):
  1. `clientIp = getClientIp(request)`, stored in context.
  2. If an `IpBlock` with `expiresAt > now` exists for that IP: 403 (translated page).
  3. If the pathname matches `config/public-routes.ts` (login, register, logout,
     `/media/*` (stored assets), `/assets/*` (build output), `/favicon.ico`, dev files): continue.
  4. Load session from cookie; if missing, expired, or user `isDisabled`: delete
     the session row if present, clear cookie, redirect to `/login?redirectTo=...`.
  5. Touch sliding expiry; set `context.user`, `context.session`; continue.
- **Roles** (`app/shared/roles.ts`): `RANK = { USER: 0, ADMIN: 1, SYSTEM_ADMIN: 2 }`;
  `hasRole(user, min)`; `requireUser(context)`, `requireRole(context, min)` throw
  a 403 response. ADMIN edits content; SYSTEM_ADMIN additionally manages users and
  settings.

## 10. Brute-force protection

Config (`app/server/security.server.ts`), env-backed with zod defaults:

| Env var                          | Default | Meaning                                                         |
| -------------------------------- | ------- | --------------------------------------------------------------- |
| `AUTH_FAILURE_WINDOW_MINUTES`    | 15      | Window for counting failures                                    |
| `AUTH_USERNAME_MAX_FAILURES`     | 5       | Failures per username before lockout                            |
| `AUTH_USERNAME_LOCKOUT_MINUTES`  | 15      | Lockout length                                                  |
| `AUTH_IP_MAX_FAILURES`           | 20      | Failures per IP before IpBlock (validated to be > username max) |
| `SESSION_EXPIRY_HOURS`           | 720     | Sliding session life                                            |
| `SESSION_TOUCH_INTERVAL_MINUTES` | 5       | Min gap between lastActivity writes                             |
| `DEFAULT_LESSON_PASSING_SCORE`   | 60      | Percent                                                         |
| `TRUSTED_PROXY_COUNT`            | 0       | Hops to trust in X-Forwarded-For                                |
| `AUTH_LOG_RETENTION_DAYS`        | 30      | Cleanup threshold                                               |

In code, not env: `IP_BLOCK_ESCALATION_MINUTES = [15, 60, 360, 1440]` and
`IP_BLOCK_ESCALATION_LOOKBACK_DAYS = 7`.

Login flow (`login.server.ts`):

1. Active IpBlock? Log `IP_BLOCKED`, fail.
2. Username failures in window >= max? Log `USERNAME_LOCKED`, fail.
3. Find user; verify hash. When the user is missing, verify against a fixed dummy
   hash anyway to equalize timing. Outcomes: `USER_DISABLED`, `USER_NOT_FOUND`,
   `BAD_PASSWORD`.
4. On failure: log it; if IP failures in window >= `AUTH_IP_MAX_FAILURES`, upsert
   the IpBlock row for this IP. If no row exists, or its `updatedAt` is older than
   the lookback, `strikeCount = 1`; otherwise `strikeCount += 1`. Set
   `expiresAt = now + ESCALATION[min(strikeCount, len) - 1]`. Updating the existing
   row in place keeps `ipAddress` unique.
5. On success: log success, create session.
6. Every failure returns the same translated message ("wrong username or password").

Client IP: with `TRUSTED_PROXY_COUNT = 0` use the socket address; otherwise take the
N-th entry from the right of X-Forwarded-For. README documents this and states that
DDoS mitigation belongs at the network/proxy layer.

Cleanup: `cleanupSecurityTables()` deletes IpBlocks whose `expiresAt` has passed
and whose `updatedAt` is older than the escalation lookback (expired rows are kept
during the lookback so escalation can keep counting), and AuthLogs older than
retention. Exposed as `npm run cleanup`; README suggests a
cron entry.

## 11. Routes and pages (foundation UI only)

- `/login`, `/register`, `/logout`: plain forms, Hebrew labels.
- `/` redirects to `/subjects`.
- `/subjects`: active subjects; enroll button adds the m:n link.
- `/subjects/:slug`: sections in order, lessons with locked/completed badges.
- `/subjects/:slug/lessons/:lessonId`: `LessonContent` + `QuestionsPlaceholder`.
- `/admin`: ADMIN layout, "TODO content editor" page.
- `/admin/users`: SYSTEM_ADMIN, "TODO user management" page.

Minimal CSS only: one global stylesheet using logical properties so RTL and LTR
both work.

## 12. Seed (`prisma/seed.ts`)

1. SYSTEM_ADMIN from `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, optional
   `SEED_ADMIN_EMAIL`; upsert by username.
2. Copy `prisma/seed-data/placeholder.png` into storage, create one `Asset`.
3. **Subject 1, slug `genesis`** (locale `he`, direction `rtl`), four sections:
   - 1 אברהם: הבטחה ומסע: פרק יב, יג, טו, טז
   - 2 אברהם: ברית ונסיון: פרק יח, כא, כב, כג
   - 3 יצחק ויעקב: פרק כד, כה, כז
   - 4 יעקב בחרן: פרק כח, כט
     Each lesson has placeholder content containing a heading, a paragraph with
     bold/italic/highlight spans, a quote block (reference, highlight range,
     sourceLabel), the image asset with alt text, and a list. No questions.
4. **Subject 2, slug `sample-ltr`** (locale `en`, direction `ltr`), deliberately a
   different shape: two sections with 3 and 2 lessons. Placeholders include a quote
   with an English `sourceLabel` and one paragraph with `dir: "rtl"` to exercise the
   per-block override. Its description marks it as a demo subject to remove later.
5. The seed is idempotent (upsert by slug and sortOrder).

Nothing outside `prisma/seed-data/` may contain subject content, chapter names, or
subject-specific terms. `scripts/check-no-subject-leakage.ts` scans `app/` for a
configurable list of forbidden tokens and runs as part of `npm run lint`.

## 13. Adding a new subject (operational checklist)

1. Insert a `Subject` row: slug, name, description, locale, direction, sortOrder.
2. Insert `Section` rows with `sortOrder` 1..n.
3. Insert `Lesson` rows per section with `sortOrder`, optional `passingScore`, and
   `content` validated by `LessonContent`.
4. Upload any images, create `Asset` rows, reference them by `assetId` in image blocks.
5. Optionally attach `Material` rows.
6. Optionally add `Question`/`QuestionOption` rows (no UI yet).
7. Set `isActive = true`. Users enroll via the subject picker.

All steps are data-only. The only code change a new subject can require is a new
block type (e.g. `formula` for math), which is a platform extension, not a subject
concern. If a subject ever needs its own route, component, or branch in `app/`,
that is a design defect to be fixed by generalizing the model.

## 14. Testing

- Unit (vitest): block schema accept/reject cases; `resolveDirection`; unlock logic
  with an in-memory fixture tree; escalation duration math; client-IP parsing with
  0/1/2 trusted proxies; role hierarchy.
- Integration (vitest against the compose MariaDB): register, login, guarded page;
  lockout after N failures; IpBlock after M; sliding expiry touch; seed runs twice
  without error; `recordAttempt` keeps best score and never clears completion.
- No end-to-end tests in this phase.

## 15. Out of scope / TODO markers

Quiz UI and answer submission, question content import from Firebase, streaks
(attempt timestamps and `User.timezone` are ready), gamification, content editor,
asset upload UI, 2FA (`AuthLogType.twoFactorAuthentication` reserved), cloud
storage provider, email verification, password reset, explicit Enrollment table.
