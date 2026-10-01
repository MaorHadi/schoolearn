# Study Platform

A multi-subject study web app. Users pick a subject and progress through ordered sections and
lessons; passing a lesson's questions unlocks the next one. Subjects are pure data, so adding one
needs no code. The first seeded subject is Genesis (Hebrew, RTL); a second English LTR demo
subject proves the platform is subject-agnostic.

Stack: React Router v8 (framework mode, SSR, middleware), React 19, TypeScript strict, Prisma 7
with MariaDB, zod, argon2, Vitest.

## Prerequisites

- Node 24+
- Docker Desktop (for the local MariaDB)

## Setup

```bash
cp .env.example .env        # then edit SESSION_SECRET and SEED_ADMIN_PASSWORD
npm install
npm run db:up               # MariaDB in Docker on localhost:3307
npm run db:migrate          # apply migrations, generate the Prisma client
npm run db:seed             # SYSTEM_ADMIN user + two demo subjects
npm run dev                 # http://localhost:5173
```

Log in with `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` from your `.env`, or register a new
account at `/register`.

The database uses host port **3307** to avoid clashing with a locally installed MySQL on 3306.
Inside the container it is still 3306.

## Scripts

| Script                            | What it does                                                                |
| --------------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`                     | Dev server with HMR                                                         |
| `npm run build` / `npm start`     | Production build / serve it (env must be set in the environment)            |
| `npm run typecheck`               | Route typegen + `tsc`                                                       |
| `npm run lint`                    | ESLint, Prettier check, subject-leakage check                               |
| `npm run format`                  | Prettier write                                                              |
| `npm test` / `npm run test:watch` | Vitest (DB tests need `npm run db:up`)                                      |
| `npm run db:up` / `db:down`       | Start / stop MariaDB                                                        |
| `npm run db:migrate`              | `prisma migrate dev`                                                        |
| `npm run db:deploy`               | `prisma migrate deploy` (production)                                        |
| `npm run db:seed`                 | Run the seed                                                                |
| `npm run db:reset`                | Drop, migrate, seed. **Destructive, no prompt**; check `DATABASE_URL` first |
| `npm run db:studio`               | Prisma Studio                                                               |
| `npm run cleanup`                 | Delete expired IP blocks and old auth logs                                  |

## Environment variables

All variables are documented in `.env.example` and validated at startup by `env.schema.ts`.
The app refuses to start on an invalid or missing value.

| Variable                                       | Default                    | Meaning                                                    |
| ---------------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`                                 | (required)                 | MariaDB connection string                                  |
| `SESSION_SECRET`                               | (required, 16+)            | Signs the session cookie                                   |
| `SESSION_EXPIRY_HOURS`                         | 720                        | Sliding session life                                       |
| `SESSION_TOUCH_INTERVAL_MINUTES`               | 5                          | Min gap between `lastActivity` writes                      |
| `AUTH_FAILURE_WINDOW_MINUTES`                  | 15                         | Window for counting login failures                         |
| `AUTH_USERNAME_MAX_FAILURES`                   | 5                          | Failures per username before temporary lockout             |
| `AUTH_USERNAME_LOCKOUT_MINUTES`                | 15                         | Lockout length                                             |
| `AUTH_IP_MAX_FAILURES`                         | 20                         | Failures per IP before an IP block (must exceed the above) |
| `AUTH_LOG_RETENTION_DAYS`                      | 30                         | `npm run cleanup` deletes older `AuthLog` rows             |
| `TRUSTED_PROXY_COUNT`                          | 0                          | Trusted `X-Forwarded-For` hops (see below)                 |
| `DEFAULT_LESSON_PASSING_SCORE`                 | 60                         | Percent, when a lesson has no `passingScore`               |
| `STORAGE_PROVIDER`                             | `local`                    | Asset storage backend                                      |
| `STORAGE_LOCAL_DIR`                            | `./storage`                | Where the local provider writes files                      |
| `SEED_ADMIN_USERNAME` / `_PASSWORD` / `_EMAIL` | `admin` / (set it) / empty | The seeded SYSTEM_ADMIN                                    |

## Security notes

### Brute-force protection (not DDoS mitigation)

Every login attempt is written to `AuthLog` with a reason. Counting recent failures gives two
independent limits:

- **Per username:** after `AUTH_USERNAME_MAX_FAILURES` failures within the lockout window, the
  account is temporarily locked even if the next password is correct.
- **Per IP:** after `AUTH_IP_MAX_FAILURES` failures within the failure window, an `IpBlock` is
  created. The IP threshold is deliberately higher because many students share one school IP.
  Repeat offenders escalate in place: 15 min, 1 h, 6 h, 24 h (`app/server/security.server.ts`).

Every failure returns the same message, so the UI never reveals whether a username exists.

This protects against password guessing. **It is not DDoS protection.** Request floods must be
handled at the network or reverse-proxy layer (nginx, Caddy, Cloudflare, a cloud WAF), not by the
application.

### Reverse proxy and client IP

`TRUSTED_PROXY_COUNT=0` (the default) never trusts `X-Forwarded-For`; the client IP is recorded as
`unknown`, per-IP blocking is inactive, and only username lockout applies. In production, run
behind a reverse proxy and set `TRUSTED_PROXY_COUNT` to the number of proxy hops you control
(usually `1`). The app then takes the N-th address from the right of `X-Forwarded-For`, so
client-supplied values cannot spoof it. The app logs a startup warning if production runs with
`TRUSTED_PROXY_COUNT=0`. The `unknown` IP is never blocked.

### Cleanup

Run `npm run cleanup` periodically to delete expired IP blocks (after the 7-day escalation
lookback) and old `AuthLog` rows. Example cron:

```
0 3 * * * cd /srv/study-platform && npm run cleanup
```

### Development database privileges

`docker/mariadb-init/` grants the dev user server-wide privileges on first volume creation so
`prisma migrate dev` can create its shadow database. Development only; production uses
`prisma migrate deploy`, which needs no shadow database.

## Content model

```
Subject → Section → Lesson → Question → QuestionOption
```

- A **Subject** has a `locale` and a content `direction` (rtl/ltr). The UI shell is Hebrew RTL;
  lesson content follows the subject, with optional per-block overrides.
- **Sections** are difficulty brackets in `sortOrder`. **Lessons** inside them are ordered too.
- `Lesson.content` is a JSON array of typed blocks (heading, paragraph, quote, image, list),
  validated by zod on every read and write. Image blocks reference an `Asset`; the `LessonAsset`
  table tracks usage so a used asset cannot be deleted.
- **Progression:** lesson 1 of section 1 is open; passing a lesson (score ≥ its `passingScore`
  or the default) opens the next; completing a section opens the next section. Lessons are
  repeatable; the best score is kept and nothing ever re-locks. See `app/shared/unlock.ts`.
- **Roles:** `USER` learns; `ADMIN` edits content (`/admin`); `SYSTEM_ADMIN` also manages users
  and settings (`/system-admin`).

Full design: `docs/superpowers/specs/2026-10-01-study-platform-foundation-design.md`.

## Adding a new subject

Data only. No code changes.

1. Insert a `Subject` (slug, name, description, locale, direction, sortOrder).
2. Insert `Section` rows with `sortOrder`.
3. Insert `Lesson` rows per section with `sortOrder`, optional `passingScore`, and content written
   through `saveLessonContent()` so it is validated and asset usage is tracked.
4. Upload any images via `createAssetFromBuffer()` and reference them by `assetId`.
5. Optionally attach `Material` rows and `Question`/`QuestionOption` rows.
6. Set `isActive = true`. Users enroll from `/subjects`.

See `prisma/seed-data/` for two complete examples. If a subject ever seems to need its own route
or component, that is a platform gap to fix generically.

## Adding a new content block type

1. Define the schema in `app/schemas/content-blocks.ts` and add it to the `ContentBlock` union.
2. Add a renderer in `app/components/lesson-content/blocks/`.
3. Register it in `app/components/lesson-content/LessonContent.tsx`. The build fails until you do.
4. No migration: `Lesson.content` is JSON and existing lessons stay valid.

## Testing

```bash
npm run db:up
npm test
```

Tests live in `tests/` mirroring `app/`. Database tests reset all tables, so point
`DATABASE_URL` at the Docker database, never at anything you care about.

## Not yet built

Quiz UI and answer submission, question content, streaks (attempt timestamps and
`User.timezone` are in place), gamification, content editor, asset upload UI, 2FA, cloud storage,
email verification, password reset. Each has a `TODO(<feature>)` marker where it plugs in.
