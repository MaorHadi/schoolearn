# Study Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of a general multi-subject study web app: schema, auth, sessions, route guard, brute-force protection, lesson content blocks, progression logic, and a seed with two subjects.

**Architecture:** React Router v8 framework mode with its stable middleware API as the single route guard. All DB and secret access lives in `*.server.ts` modules; shared pure modules (block schemas, roles, direction) are plain `.ts`. Subjects are pure data; no code may reference a specific subject.

**Tech Stack:** react-router 8.4.x (middleware on by default, ESM-only), React 19.3, Vite 7, TypeScript 5 strict, Prisma 7.10 with `@prisma/adapter-mariadb`, MariaDB 11 (Docker), zod 4, argon2, vitest 5, ESLint 10 flat config, Prettier 3, tsx.

**Spec:** `docs/superpowers/specs/2026-10-01-study-platform-foundation-design.md`

## How this plan is run

The plan is split into **7 stages**. Each stage ends with a "Stage checkpoint" listing exactly what the user can run to verify it. **Stop after each stage and wait for the user.** The user commits; never run `git commit`, `git add`, `git reset`, or any history-changing git command (see `CLAUDE.md`).

TDD applies: write the failing test, run it, implement, run it green. Where a step says "Run", run it from the repo root `C:\Users\User\Documents\schoolearn`.

## Global Constraints

- TypeScript `strict: true`; no `any` without an eslint-disable comment explaining why.
- Prisma and `process.env` only in files named `*.server.ts` (or `prisma/`, `scripts/`).
- Shared modules (`app/lib/content/blocks.ts`, `direction.ts`, `app/lib/auth/roles.ts`, `app/i18n/*`) import nothing from Node or Prisma.
- UI: `<html lang="he" dir="rtl">`; all user-visible strings via `t("key")` from `app/i18n`.
- No subject-specific names, strings, or logic outside `prisma/seed-data/`. Forbidden tokens checked by `scripts/check-no-subject-leakage.ts`.
- Env defaults (verbatim from spec): `AUTH_FAILURE_WINDOW_MINUTES=15`, `AUTH_USERNAME_MAX_FAILURES=5`, `AUTH_USERNAME_LOCKOUT_MINUTES=15`, `AUTH_IP_MAX_FAILURES=20` (> username max), `SESSION_EXPIRY_HOURS=720`, `SESSION_TOUCH_INTERVAL_MINUTES=5`, `DEFAULT_LESSON_PASSING_SCORE=60`, `TRUSTED_PROXY_COUNT=0`, `AUTH_LOG_RETENTION_DAYS=30`.
- In code only: `IP_BLOCK_ESCALATION_MINUTES = [15, 60, 360, 1440]`, `IP_BLOCK_ESCALATION_LOOKBACK_DAYS = 7`.
- Every failed login returns the same message. Registration failures are equally generic.
- Session cookie: name `__session`, httpOnly, sameSite lax, secure in production, signed.
- Never create an IpBlock for the sentinel IP `"unknown"` (it would block everyone). Still log those attempts to AuthLog; username lockout covers them.
- In production (`NODE_ENV=production`) with `TRUSTED_PROXY_COUNT=0`, log a clear startup warning that IP blocking is inactive.
- If any library has compatibility issues with React Router 8, stop and report rather than working around it.

## Review Focus

Inputs the spec implies but which are easy to get wrong. Each has a pinned test in the owning task.

1. **X-Forwarded-For with more hops than trusted** (e.g. header `"1.1.1.1, 2.2.2.2, 3.3.3.3"`, `TRUSTED_PROXY_COUNT=1`): must return `3.3.3.3`, never the spoofable left-most. Test in Task 4.1.
2. **Lesson content stored in DB that fails validation** (e.g. unknown block type): the lesson page must render an error boundary, not crash the server or leak raw JSON. Test in Task 5.2.
3. **Sections with gaps in sortOrder or a section with zero lessons**: unlock logic must treat an empty previous section as "completed" and must use ordering, not `sortOrder - 1` arithmetic. Test in Task 6.1.
4. **Expired session cookie that still points at an existing row** and **a disabled user with a valid session**: both must redirect to login and delete the row. Test in Task 4.3.
5. **Quote highlight range beyond text length or `start > end`**: schema must reject it, so the renderer never slices out of range. Test in Task 5.1.

---

## Stage 1: Project setup, tooling, Docker

### Task 1.1: Scaffold React Router v8 app

**Files:**

- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `react-router.config.ts`, `app/root.tsx`, `app/routes.ts`, `app/entry.client.tsx`, `app/entry.server.tsx`, `app/app.css`, `app/routes/home.tsx`, `.gitignore`
- Modify: `README.md`

**Interfaces:**

- Produces: `app/routes.ts` default export `RouteConfig`; `root.tsx` with `Layout`, `App`, `ErrorBoundary`.

- [ ] **Step 1: Create package.json**

```json
{
  "name": "study-platform",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "start": "react-router-serve ./build/server/index.js",
    "typecheck": "react-router typegen && tsc --noEmit",
    "lint": "eslint . && prettier --check . && tsx scripts/check-no-subject-leakage.ts",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset --force",
    "db:studio": "prisma studio",
    "cleanup": "tsx scripts/cleanup.ts"
  },
  "dependencies": {
    "@prisma/adapter-mariadb": "7.10.0",
    "@prisma/client": "7.10.0",
    "@react-router/node": "^8.4.0",
    "@react-router/serve": "^8.4.0",
    "argon2": "^0.45.1",
    "isbot": "^5.2.2",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "react-router": "^8.4.0",
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@react-router/dev": "^8.4.0",
    "@types/node": "^24.0.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "dotenv": "^18.0.5",
    "eslint": "^10.11.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-react": "^7.37.5",
    "eslint-plugin-react-hooks": "^7.1.1",
    "prettier": "^3.9.9",
    "prisma": "7.10.0",
    "tsx": "^4.23.0",
    "typescript": "^5.9.0",
    "typescript-eslint": "^8.71.0",
    "vite": "^7.3.6",
    "vite-tsconfig-paths": "^6.1.1",
    "vitest": "^5.0.3"
  }
}
```

Note: TypeScript stays on 5.x because typescript-eslint 8 is verified against it (React Router 8 accepts 5, 6, or 7). Vite 7 is the floor React Router 8 requires; React must be 19.2.7 or newer.

- [ ] **Step 2: Install**

Run: `npm install`
Expected: completes; `node_modules/.bin/react-router` exists. If `argon2` fails to find a prebuilt binary on Node 24, run `npm rebuild argon2` and report.

- [ ] **Step 3: tsconfig.json**

```json
{
  "include": ["**/*.ts", "**/*.tsx", ".react-router/types/**/*"],
  "exclude": ["node_modules", "build", "storage"],
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "types": ["node", "vite/client"],
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "rootDirs": [".", "./.react-router/types"],
    "baseUrl": ".",
    "paths": { "~/*": ["./app/*"] },
    "esModuleInterop": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 4: vite.config.ts and react-router.config.ts**

```ts
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
});
```

```ts
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

// Middleware is on by default in v8; no future flag needed.
export default {
  ssr: true,
} satisfies Config;
```

- [ ] **Step 5: Entries, root, routes, placeholder home**

```tsx
// app/entry.client.tsx
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
```

```tsx
// app/entry.server.tsx
import { PassThrough } from "node:stream";
import type { AppLoadContext, EntryContext } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");
    const readyOption: "onAllReady" | "onShellReady" =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(new Response(stream, { headers: responseHeaders, status: responseStatusCode }));
          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) console.error(error);
        },
      },
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
```

```tsx
// app/root.tsx
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "שגיאה";
  let detail = "אירעה שגיאה בלתי צפויה.";
  if (isRouteErrorResponse(error)) {
    title = String(error.status);
    detail = typeof error.data === "string" ? error.data : error.statusText;
  }
  return (
    <main className="container">
      <h1>{title}</h1>
      <p>{detail}</p>
    </main>
  );
}
```

```ts
// app/routes.ts
import { type RouteConfig, index } from "@react-router/dev/routes";

export default [index("routes/home.tsx")] satisfies RouteConfig;
```

```tsx
// app/routes/home.tsx
export default function Home() {
  return (
    <main className="container">
      <h1>Study Platform</h1>
    </main>
  );
}
```

```css
/* app/app.css */
:root {
  color-scheme: light;
  font-family: system-ui, sans-serif;
}
body {
  margin: 0;
  background: #f7f7f5;
  color: #1a1a1a;
}
.container {
  max-width: 56rem;
  margin-inline: auto;
  padding-block: 1.5rem;
  padding-inline: 1rem;
}
```

- [ ] **Step 6: .gitignore**

```
node_modules
build
.react-router
.env
storage/
prisma/generated
coverage
```

- [ ] **Step 7: Verify**

Run: `npm run dev` (in background), then `curl -s http://localhost:5173 | head -5`
Expected: HTML containing `dir="rtl"` and `Study Platform`. Stop the dev server.

### Task 1.2: ESLint, Prettier, leakage check

**Files:**

- Create: `eslint.config.js`, `.prettierrc`, `.prettierignore`, `scripts/check-no-subject-leakage.ts`

- [ ] **Step 1: eslint.config.js**

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "build/**",
      ".react-router/**",
      "prisma/generated/**",
      "node_modules/**",
      "legacy-android/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs["recommended-latest"].rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  {
    // Server-only modules must never be imported from client-capable files.
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/**/*.server.{ts,tsx}", "app/entry.server.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/*.server", "**/*.server.ts", "**/*.server.tsx"],
              message:
                "Server modules can only be imported from other *.server.ts files or from route loaders/actions via the route module (which React Router strips).",
            },
            {
              group: ["@prisma/client", "prisma/generated/*", "~/server/database.server"],
              message: "Prisma only in *.server.ts",
            },
          ],
        },
      ],
    },
  },
  {
    // Route modules may import server code: React Router removes loader/action/middleware from the client bundle.
    files: ["app/routes/**/*.tsx", "app/root.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
  prettier,
);
```

- [ ] **Step 2: Prettier**

```json
// .prettierrc
{ "printWidth": 100, "singleQuote": false, "trailingComma": "all" }
```

```
# .prettierignore
build
.react-router
prisma/generated
legacy-android
storage
package-lock.json
```

- [ ] **Step 3: Leakage check script**

```ts
// scripts/check-no-subject-leakage.ts
// Fails if any file under app/ contains a token that belongs to a specific subject.
// Extend FORBIDDEN when a new subject is seeded.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "app");
const FORBIDDEN = [
  "bible",
  "biblearn",
  "genesis",
  'תנ"ך',
  "בראשית",
  "אברהם",
  "יעקב",
  "snunit",
  "sample-ltr",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const offenders: string[] = [];
for (const file of walk(ROOT)) {
  const text = readFileSync(file, "utf8").toLowerCase();
  for (const token of FORBIDDEN) {
    if (text.includes(token.toLowerCase())) offenders.push(`${file}: "${token}"`);
  }
}

if (offenders.length > 0) {
  console.error("Subject-specific content found outside seed data:\n" + offenders.join("\n"));
  process.exit(1);
}
console.log("No subject leakage in app/.");
```

- [ ] **Step 4: Verify**

Run: `npm run lint`
Expected: ESLint passes, Prettier check passes (run `npm run format` first if needed), leakage script prints "No subject leakage in app/."

### Task 1.3: Docker Compose, env validation, .env.example

**Files:**

- Create: `docker-compose.yml`, `.env.example`, `.env` (copy), `app/config/env.server.ts`, `tests/config/env.test.ts`, `vitest.config.ts`

**Interfaces:**

- Produces: `env` object from `~/server/env.server` with typed fields listed below; `parseEnv(raw: Record<string, string | undefined>)` for tests.

- [ ] **Step 1: docker-compose.yml**

```yaml
services:
  db:
    image: mariadb:11
    restart: unless-stopped
    environment:
      MARIADB_ROOT_PASSWORD: root
      MARIADB_DATABASE: study
      MARIADB_USER: study
      MARIADB_PASSWORD: study
    ports:
      - "3306:3306"
    volumes:
      - dbdata:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 5s
      timeout: 3s
      retries: 20
volumes:
  dbdata:
```

- [ ] **Step 2: .env.example**

```dotenv
# --- Database (MariaDB via Docker Compose) ---
DATABASE_URL="mysql://study:study@localhost:3306/study"

# --- App ---
NODE_ENV=development
SESSION_SECRET="change-me-to-a-long-random-string"

# --- Sessions ---
SESSION_EXPIRY_HOURS=720            # sliding; each activity extends by this much
SESSION_TOUCH_INTERVAL_MINUTES=5    # min gap between lastActivity writes

# --- Brute-force protection (counts come from AuthLog) ---
AUTH_FAILURE_WINDOW_MINUTES=15      # window for counting failures
AUTH_USERNAME_MAX_FAILURES=5        # per-username failures before temporary lockout
AUTH_USERNAME_LOCKOUT_MINUTES=15
AUTH_IP_MAX_FAILURES=20             # per-IP failures before IpBlock; must be > username max
AUTH_LOG_RETENTION_DAYS=30          # cleanup threshold for AuthLog rows
# Escalating block durations live in app/config/security.server.ts (code, not env).

# --- Reverse proxy ---
TRUSTED_PROXY_COUNT=0               # 0 = use socket IP; N = trust N hops of X-Forwarded-For

# --- Learning ---
DEFAULT_LESSON_PASSING_SCORE=60     # percent, used when Lesson.passingScore is null

# --- Storage ---
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=./storage

# --- Seed ---
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD="change-me"
SEED_ADMIN_EMAIL=
```

Copy to `.env` (`cp .env.example .env`); `.env` is gitignored.

- [ ] **Step 3: Failing test for env parsing**

```ts
// tests/config/env.test.ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "~/server/env.server";

const base = { DATABASE_URL: "mysql://x", SESSION_SECRET: "s".repeat(16) };

describe("parseEnv", () => {
  it("applies defaults", () => {
    const env = parseEnv(base);
    expect(env.AUTH_IP_MAX_FAILURES).toBe(20);
    expect(env.AUTH_USERNAME_MAX_FAILURES).toBe(5);
    expect(env.SESSION_EXPIRY_HOURS).toBe(720);
    expect(env.DEFAULT_LESSON_PASSING_SCORE).toBe(60);
    expect(env.TRUSTED_PROXY_COUNT).toBe(0);
    expect(env.STORAGE_PROVIDER).toBe("local");
  });
  it("rejects IP max not greater than username max", () => {
    expect(() =>
      parseEnv({ ...base, AUTH_IP_MAX_FAILURES: "5", AUTH_USERNAME_MAX_FAILURES: "5" }),
    ).toThrow(/AUTH_IP_MAX_FAILURES/);
  });
  it("rejects missing SESSION_SECRET", () => {
    expect(() => parseEnv({ DATABASE_URL: "mysql://x" })).toThrow();
  });
  it("coerces numeric strings", () => {
    expect(parseEnv({ ...base, SESSION_EXPIRY_HOURS: "24" }).SESSION_EXPIRY_HOURS).toBe(24);
  });
});
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
  },
});
```

```ts
// tests/setup.ts
process.env.DATABASE_URL ??= "mysql://study:study@localhost:3306/study";
process.env.SESSION_SECRET ??= "test-secret-test-secret";
```

- [ ] **Step 4: Run, expect failure**

Run: `npx vitest run tests/config`
Expected: FAIL, cannot resolve `~/server/env.server`.

- [ ] **Step 5: Implement env.server.ts**

```ts
// app/config/env.server.ts
import { z } from "zod";

const intFrom = (def: number, min = 0) => z.coerce.number().int().min(min).default(def);

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    SESSION_SECRET: z.string().min(16),
    SESSION_EXPIRY_HOURS: intFrom(720, 1),
    SESSION_TOUCH_INTERVAL_MINUTES: intFrom(5, 0),
    AUTH_FAILURE_WINDOW_MINUTES: intFrom(15, 1),
    AUTH_USERNAME_MAX_FAILURES: intFrom(5, 1),
    AUTH_USERNAME_LOCKOUT_MINUTES: intFrom(15, 1),
    AUTH_IP_MAX_FAILURES: intFrom(20, 1),
    AUTH_LOG_RETENTION_DAYS: intFrom(30, 1),
    TRUSTED_PROXY_COUNT: intFrom(0, 0),
    DEFAULT_LESSON_PASSING_SCORE: z.coerce.number().int().min(0).max(100).default(60),
    STORAGE_PROVIDER: z.enum(["local"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("./storage"),
    SEED_ADMIN_USERNAME: z.string().optional(),
    SEED_ADMIN_PASSWORD: z.string().optional(),
    SEED_ADMIN_EMAIL: z.string().optional(),
  })
  .refine((e) => e.AUTH_IP_MAX_FAILURES > e.AUTH_USERNAME_MAX_FAILURES, {
    message:
      "AUTH_IP_MAX_FAILURES must be greater than AUTH_USERNAME_MAX_FAILURES (many users share one IP)",
    path: ["AUTH_IP_MAX_FAILURES"],
  });

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== "" && v !== undefined),
  );
  const result = EnvSchema.safeParse(cleaned);
  if (!result.success) {
    throw new Error("Invalid environment:\n" + JSON.stringify(result.error.issues, null, 2));
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);

if (env.NODE_ENV === "production" && env.TRUSTED_PROXY_COUNT === 0) {
  console.warn(
    "[security] TRUSTED_PROXY_COUNT=0 in production: client IPs resolve to 'unknown', so per-IP blocking is inactive. " +
      "Run behind a reverse proxy and set TRUSTED_PROXY_COUNT to the number of trusted hops.",
  );
}
```

- [ ] **Step 6: Run, expect pass**

Run: `npx vitest run tests/config`
Expected: 4 passed.

- [ ] **Step 7: Start DB**

Run: `npm run db:up` then `docker compose ps`
Expected: `db` healthy.

### Stage 1 checkpoint (stop here)

User can verify:

- `npm run dev` serves an RTL page at http://localhost:5173
- `npm run lint`, `npm run typecheck`, `npm test` all pass
- `docker compose ps` shows a healthy MariaDB

---

## Stage 2: Prisma schema and migration

### Task 2.1: Prisma config, schema, client singleton

**Files:**

- Create: `prisma.config.ts`, `prisma/schema.prisma`, `app/lib/database.server.ts`, `tests/db/schema.test.ts`

**Interfaces:**

- Produces: `prisma` (PrismaClient) from `~/server/database.server`; generated types from `prisma/generated/client`.

- [ ] **Step 1: prisma.config.ts**

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

- [ ] **Step 2: schema.prisma** (exactly the spec §5 models; `url` is in config, not here)

```prisma
generator client {
  provider = "prisma-client"
  output   = "./generated/client"
}

datasource db {
  provider = "mysql"
}

enum Role {
  USER
  ADMIN
  SYSTEM_ADMIN
}

enum AuthLogType {
  login
  twoFactorAuthentication // reserved; 2FA not implemented
}

enum TextDirection {
  rtl
  ltr
}

enum MaterialKind {
  FILE
  LINK
  TEXT
}

model User {
  id           Int              @id @default(autoincrement())
  username     String           @unique
  email        String?          @unique
  passwordHash String
  role         Role             @default(USER)
  isDisabled   Boolean          @default(false)
  timezone     String           @default("Asia/Jerusalem")
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  subjects     Subject[]
  sessions     Session[]
  attempts     LessonAttempt[]
  progress     LessonProgress[]
  assets       Asset[]
}

model Session {
  id             String    @id @default(cuid(2))
  expirationDate DateTime
  createdAt      DateTime  @default(now())
  lastActivity   DateTime?
  ip             String?
  sessionData    Json
  user           User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId         Int?

  @@index([userId])
  @@index([expirationDate])
}

model AuthLog {
  id            Int         @id @default(autoincrement())
  ipAddress     String
  username      String
  createdAt     DateTime    @default(now())
  isSuccessful  Boolean
  failureReason String?
  type          AuthLogType

  @@index([ipAddress, createdAt])
  @@index([username, createdAt])
}

model IpBlock {
  id          Int      @id @default(autoincrement())
  ipAddress   String   @unique
  reason      String?
  strikeCount Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  expiresAt   DateTime

  @@index([expiresAt])
}

model Subject {
  id          Int           @id @default(autoincrement())
  slug        String        @unique
  name        String
  description String?       @db.Text
  locale      String
  direction   TextDirection
  isActive    Boolean       @default(true)
  sortOrder   Int           @default(0)
  sections    Section[]
  users       User[]
}

model Section {
  id        Int      @id @default(autoincrement())
  subject   Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  subjectId Int
  title     String
  sortOrder Int
  lessons   Lesson[]

  @@unique([subjectId, sortOrder])
}

model Lesson {
  id           Int              @id @default(autoincrement())
  section      Section          @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  sectionId    Int
  title        String
  sortOrder    Int
  passingScore Int?
  content      Json
  questions    Question[]
  materials    Material[]
  attempts     LessonAttempt[]
  progress     LessonProgress[]

  @@unique([sectionId, sortOrder])
}

model Question {
  id        Int              @id @default(autoincrement())
  lesson    Lesson           @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  lessonId  Int
  prompt    String           @db.Text
  sortOrder Int
  options   QuestionOption[]

  @@unique([lessonId, sortOrder])
}

model QuestionOption {
  id         Int      @id @default(autoincrement())
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  questionId Int
  text       String   @db.Text
  isCorrect  Boolean
  sortOrder  Int
}

model Material {
  id        Int          @id @default(autoincrement())
  lesson    Lesson       @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  lessonId  Int
  kind      MaterialKind
  title     String
  url       String?
  body      String?      @db.Text
  asset     Asset?       @relation(fields: [assetId], references: [id])
  assetId   Int?
  sortOrder Int          @default(0)
}

model Asset {
  id           Int        @id @default(autoincrement())
  storageKey   String     @unique
  mimeType     String
  byteSize     Int
  width        Int?
  height       Int?
  uploadedBy   User?      @relation(fields: [uploadedById], references: [id])
  uploadedById Int?
  createdAt    DateTime   @default(now())
  materials    Material[]
}

model LessonAttempt {
  id        Int      @id @default(autoincrement())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    Int
  lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  lessonId  Int
  score     Int
  passed    Boolean
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@index([userId, lessonId])
}

model LessonProgress {
  id          Int       @id @default(autoincrement())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      Int
  lesson      Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  lessonId    Int
  bestScore   Int
  completedAt DateTime?
  updatedAt   DateTime  @updatedAt

  @@unique([userId, lessonId])
}
```

- [ ] **Step 3: Create migration**

Run: `npx prisma migrate dev --name init`
Expected: `prisma/migrations/<ts>_init/migration.sql` created, client generated to `prisma/generated/client`.

- [ ] **Step 4: Client singleton**

```ts
// app/lib/database.server.ts
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../prisma/generated/client";
import { env } from "~/server/env.server";

function createClient() {
  const url = new URL(env.DATABASE_URL);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  });
  return new PrismaClient({ adapter });
}

declare global {
  // eslint-disable-next-line no-var -- global cache survives Vite HMR in dev
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = globalThis.__prisma ?? createClient();
if (env.NODE_ENV !== "production") globalThis.__prisma = prisma;
```

- [ ] **Step 5: Smoke test against the real DB**

```ts
// tests/db/schema.test.ts
import { describe, expect, it } from "vitest";
import { prisma } from "~/server/database.server";

describe("database", () => {
  it("connects and sees the tables", async () => {
    const users = await prisma.user.count();
    expect(users).toBeGreaterThanOrEqual(0);
    const subjects = await prisma.subject.count();
    expect(subjects).toBeGreaterThanOrEqual(0);
  });
});
```

Run: `npx vitest run tests/db`
Expected: 1 passed (requires `npm run db:up`).

### Stage 2 checkpoint (stop here)

User can verify:

- `npx prisma migrate status` reports the database is up to date
- `npx prisma studio` shows all 13 tables
- `npm test` passes

---

## Stage 3: Auth and sessions

### Task 3.1: Password hashing

**Files:**

- Create: `app/lib/auth/password.server.ts`, `tests/auth/password.test.ts`

**Interfaces:**

- Produces: `hashPassword(plain: string): Promise<string>`, `verifyPassword(hash: string, plain: string): Promise<boolean>`, `DUMMY_HASH: string` (a valid argon2 hash of a random string, used for constant-time behaviour when the user is not found).

- [ ] **Step 1: Failing test**

```ts
// tests/auth/password.test.ts
import { describe, expect, it } from "vitest";
import { DUMMY_HASH, hashPassword, verifyPassword } from "~/server/auth/password.server";

describe("password", () => {
  it("round-trips", async () => {
    const h = await hashPassword("correct horse");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "correct horse")).toBe(true);
    expect(await verifyPassword(h, "wrong")).toBe(false);
  });
  it("dummy hash verifies nothing but does not throw", async () => {
    expect(await verifyPassword(DUMMY_HASH, "anything")).toBe(false);
  });
  it("returns false on malformed hash", async () => {
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect failure** — `npx vitest run tests/auth/password`

- [ ] **Step 3: Implement**

```ts
// app/lib/auth/password.server.ts
import argon2 from "argon2";

const OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// Pre-computed at module load so login takes the same time whether or not the user exists.
export const DUMMY_HASH: string = await argon2.hash(crypto.randomUUID(), OPTIONS);
```

- [ ] **Step 4: Run, expect pass**

### Task 3.2: Session store and cookie

**Files:**

- Create: `app/lib/auth/session.server.ts`, `tests/auth/session.test.ts`, `tests/helpers/db.ts`

**Interfaces:**

- Produces:
  - `createSession(userId: number, ip: string | null): Promise<{ id: string; cookie: string }>` — `cookie` is a `Set-Cookie` header value.
  - `getSessionFromRequest(request: Request): Promise<SessionWithUser | null>` — returns null if no cookie, bad signature, missing row, expired, or user disabled. Deletes the row in the expired/disabled cases.
  - `touchSession(session: SessionWithUser): Promise<void>` — sliding expiry, throttled.
  - `destroySession(request: Request): Promise<string>` — deletes the row; returns a clearing `Set-Cookie` value.
  - `type SessionWithUser = Session & { user: User }`.

- [ ] **Step 1: Test helpers**

```ts
// tests/helpers/db.ts
import { prisma } from "~/server/database.server";

export async function resetDb() {
  // Order matters for FKs; Cascade handles children of User/Subject.
  await prisma.$transaction([
    prisma.ipBlock.deleteMany(),
    prisma.authLog.deleteMany(),
    prisma.session.deleteMany(),
    prisma.lessonAttempt.deleteMany(),
    prisma.lessonProgress.deleteMany(),
    prisma.material.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export function requestWithCookie(url: string, cookie: string | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("Cookie", cookie.split(";")[0] ?? "");
  return new Request(url, { ...init, headers });
}
```

- [ ] **Step 2: Failing tests**

```ts
// tests/auth/session.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "~/server/database.server";
import { hashPassword } from "~/server/auth/password.server";
import {
  createSession,
  destroySession,
  getSessionFromRequest,
  touchSession,
} from "~/lib/auth/session.server";
import { requestWithCookie, resetDb } from "../helpers/db";

async function makeUser(overrides: Partial<{ isDisabled: boolean }> = {}) {
  return prisma.user.create({
    data: {
      username: "u" + Math.random().toString(36).slice(2, 8),
      passwordHash: await hashPassword("pw"),
      ...overrides,
    },
  });
}

describe("sessions", () => {
  beforeEach(resetDb);

  it("creates a row and a signed httpOnly cookie, then loads it", async () => {
    const user = await makeUser();
    const { id, cookie } = await createSession(user.id, "1.2.3.4");
    expect(cookie).toMatch(/^__session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const loaded = await getSessionFromRequest(requestWithCookie("http://x/", cookie));
    expect(loaded?.id).toBe(id);
    expect(loaded?.user.id).toBe(user.id);
    expect(loaded?.ip).toBe("1.2.3.4");
  });

  it("returns null for a tampered cookie", async () => {
    const user = await makeUser();
    const { cookie } = await createSession(user.id, null);
    const tampered = cookie.replace(/__session=([^;]+)/, "__session=$1x");
    expect(await getSessionFromRequest(requestWithCookie("http://x/", tampered))).toBeNull();
  });

  it("rejects an expired session and deletes the row", async () => {
    const user = await makeUser();
    const { id, cookie } = await createSession(user.id, null);
    await prisma.session.update({
      where: { id },
      data: { expirationDate: new Date(Date.now() - 1000) },
    });
    expect(await getSessionFromRequest(requestWithCookie("http://x/", cookie))).toBeNull();
    expect(await prisma.session.findUnique({ where: { id } })).toBeNull();
  });

  it("rejects a disabled user and deletes the row", async () => {
    const user = await makeUser({ isDisabled: true });
    const { id, cookie } = await createSession(user.id, null);
    expect(await getSessionFromRequest(requestWithCookie("http://x/", cookie))).toBeNull();
    expect(await prisma.session.findUnique({ where: { id } })).toBeNull();
  });

  it("touch extends expiry only after the throttle interval", async () => {
    const user = await makeUser();
    const { id, cookie } = await createSession(user.id, null);
    const s1 = await getSessionFromRequest(requestWithCookie("http://x/", cookie));
    // Fresh session: lastActivity just set, touch should be a no-op.
    await touchSession(s1!);
    const afterNoop = await prisma.session.findUniqueOrThrow({ where: { id } });
    expect(afterNoop.expirationDate.getTime()).toBe(s1!.expirationDate.getTime());
    // Age lastActivity beyond the interval.
    await prisma.session.update({
      where: { id },
      data: { lastActivity: new Date(Date.now() - 10 * 60_000) },
    });
    const s2 = await getSessionFromRequest(requestWithCookie("http://x/", cookie));
    await touchSession(s2!);
    const afterTouch = await prisma.session.findUniqueOrThrow({ where: { id } });
    expect(afterTouch.expirationDate.getTime()).toBeGreaterThan(s1!.expirationDate.getTime());
  });

  it("destroy deletes the row and returns a clearing cookie", async () => {
    const user = await makeUser();
    const { id, cookie } = await createSession(user.id, null);
    const clearing = await destroySession(requestWithCookie("http://x/", cookie));
    expect(clearing).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
    expect(await prisma.session.findUnique({ where: { id } })).toBeNull();
  });
});
```

- [ ] **Step 3: Run, expect failure** — `npx vitest run tests/auth/session`

- [ ] **Step 4: Implement**

```ts
// app/lib/auth/session.server.ts
import { createCookie } from "react-router";
import type { Session, User } from "../../../prisma/generated/client";
import { env } from "~/server/env.server";
import { prisma } from "~/server/database.server";

export type SessionWithUser = Session & { user: User };

const HOUR = 60 * 60 * 1000;

export const sessionCookie = createCookie("__session", {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: env.NODE_ENV === "production",
  secrets: [env.SESSION_SECRET],
  maxAge: env.SESSION_EXPIRY_HOURS * 60 * 60,
});

function expiryFromNow(): Date {
  return new Date(Date.now() + env.SESSION_EXPIRY_HOURS * HOUR);
}

export async function createSession(userId: number, ip: string | null) {
  const session = await prisma.session.create({
    data: {
      userId,
      ip,
      expirationDate: expiryFromNow(),
      lastActivity: new Date(),
      sessionData: {},
    },
  });
  const cookie = await sessionCookie.serialize(session.id);
  return { id: session.id, cookie };
}

async function readSessionId(request: Request): Promise<string | null> {
  const raw = await sessionCookie.parse(request.headers.get("Cookie"));
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export async function getSessionFromRequest(request: Request): Promise<SessionWithUser | null> {
  const id = await readSessionId(request);
  if (!id) return null;
  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!session || !session.user) return null;
  if (session.expirationDate.getTime() <= Date.now() || session.user.isDisabled) {
    await prisma.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  return session as SessionWithUser;
}

export async function touchSession(session: SessionWithUser): Promise<void> {
  const interval = env.SESSION_TOUCH_INTERVAL_MINUTES * 60 * 1000;
  const last = session.lastActivity?.getTime() ?? 0;
  if (Date.now() - last < interval) return;
  await prisma.session.update({
    where: { id: session.id },
    data: { lastActivity: new Date(), expirationDate: expiryFromNow() },
  });
}

export async function destroySession(request: Request): Promise<string> {
  const id = await readSessionId(request);
  if (id) await prisma.session.deleteMany({ where: { id } });
  return sessionCookie.serialize("", { maxAge: 0 });
}
```

- [ ] **Step 5: Run, expect pass**

### Task 3.3: Registration and login services (no brute-force yet)

**Files:**

- Create: `app/lib/auth/register.server.ts`, `app/lib/auth/login.server.ts`, `app/lib/auth/validation.ts`, `tests/auth/register.test.ts`, `tests/auth/login.test.ts`

**Interfaces:**

- Produces:
  - `RegisterInput = { username: string; email?: string; password: string }` and zod schema `RegisterSchema` in `validation.ts` (shared; used by the form too). Rules: username 3–32 `[a-zA-Z0-9_.-]`, password min 8, email optional valid.
  - `registerUser(input: RegisterInput): Promise<{ ok: true; userId: number } | { ok: false }>`.
  - `authenticate(input: { username: string; password: string }): Promise<{ ok: true; userId: number } | { ok: false; reason: LoginFailureReason }>` — pure credential check. `LoginFailureReason = "USER_NOT_FOUND" | "BAD_PASSWORD" | "USER_DISABLED" | "USERNAME_LOCKED" | "IP_BLOCKED"` (the last two are produced in Stage 4).

- [ ] **Step 1: Failing tests**

```ts
// tests/auth/register.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { registerUser } from "~/server/auth/register.server";
import { RegisterSchema } from "~/lib/auth/validation";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";

describe("RegisterSchema", () => {
  it("accepts a valid input and strips empty email", () => {
    const r = RegisterSchema.safeParse({ username: "ab.c_1", password: "12345678", email: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBeUndefined();
  });
  it("rejects short username, bad chars, short password", () => {
    expect(RegisterSchema.safeParse({ username: "ab", password: "12345678" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ username: "a b", password: "12345678" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ username: "abc", password: "1234567" }).success).toBe(false);
  });
});

describe("registerUser", () => {
  beforeEach(resetDb);
  it("creates a USER with a hashed password", async () => {
    const r = await registerUser({ username: "alice", password: "password1" });
    expect(r.ok).toBe(true);
    const u = await prisma.user.findUniqueOrThrow({ where: { username: "alice" } });
    expect(u.role).toBe("USER");
    expect(u.passwordHash).not.toBe("password1");
  });
  it("fails generically on duplicate username or email", async () => {
    await registerUser({ username: "alice", password: "password1", email: "a@x.io" });
    expect((await registerUser({ username: "alice", password: "password2" })).ok).toBe(false);
    expect(
      (await registerUser({ username: "bob", password: "password2", email: "a@x.io" })).ok,
    ).toBe(false);
  });
});
```

```ts
// tests/auth/login.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { authenticate } from "~/lib/auth/login.server";
import { registerUser } from "~/server/auth/register.server";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";

describe("authenticate", () => {
  beforeEach(async () => {
    await resetDb();
    await registerUser({ username: "alice", password: "password1" });
  });
  it("succeeds with correct credentials", async () => {
    const r = await authenticate({ username: "alice", password: "password1" });
    expect(r.ok).toBe(true);
  });
  it("reports BAD_PASSWORD, USER_NOT_FOUND, USER_DISABLED", async () => {
    expect(await authenticate({ username: "alice", password: "nope" })).toEqual({
      ok: false,
      reason: "BAD_PASSWORD",
    });
    expect(await authenticate({ username: "ghost", password: "nope" })).toEqual({
      ok: false,
      reason: "USER_NOT_FOUND",
    });
    await prisma.user.update({ where: { username: "alice" }, data: { isDisabled: true } });
    expect(await authenticate({ username: "alice", password: "password1" })).toEqual({
      ok: false,
      reason: "USER_DISABLED",
    });
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement**

```ts
// app/lib/auth/validation.ts  (shared: no server imports)
import { z } from "zod";

export const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export const RegisterSchema = z.object({
  username: z.string().regex(USERNAME_RE),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.string().email().optional()),
  password: z.string().min(8).max(200),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  username: z.string().min(1).max(32),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export type LoginFailureReason =
  "USER_NOT_FOUND" | "BAD_PASSWORD" | "USER_DISABLED" | "USERNAME_LOCKED" | "IP_BLOCKED";
```

```ts
// app/lib/auth/register.server.ts
import { prisma } from "~/server/database.server";
import { hashPassword } from "./password.server";
import type { RegisterInput } from "./validation";

export async function registerUser(
  input: RegisterInput,
): Promise<{ ok: true; userId: number } | { ok: false }> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: { username: input.username, email: input.email ?? null, passwordHash },
    });
    return { ok: true, userId: user.id };
  } catch {
    // Unique violation or anything else: never reveal which.
    return { ok: false };
  }
}
```

```ts
// app/lib/auth/login.server.ts
import { prisma } from "~/server/database.server";
import { DUMMY_HASH, verifyPassword } from "./password.server";
import type { LoginFailureReason, LoginInput } from "./validation";

export type AuthResult = { ok: true; userId: number } | { ok: false; reason: LoginFailureReason };

/** Pure credential check. Brute-force gating wraps this in Stage 4. */
export async function authenticate(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { username: input.username } });
  if (!user) {
    await verifyPassword(DUMMY_HASH, input.password); // equalize timing
    return { ok: false, reason: "USER_NOT_FOUND" };
  }
  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) return { ok: false, reason: "BAD_PASSWORD" };
  if (user.isDisabled) return { ok: false, reason: "USER_DISABLED" };
  return { ok: true, userId: user.id };
}
```

- [ ] **Step 4: Run, expect pass**

### Task 3.4: i18n layer and public auth routes

**Files:**

- Create: `app/i18n/he.ts`, `app/i18n/index.ts`, `app/routes/public/login.tsx`, `app/routes/public/register.tsx`, `app/routes/public/logout.tsx`, `app/lib/auth/client-ip.server.ts` (minimal; full version in Task 4.1)
- Modify: `app/routes.ts`

**Interfaces:**

- Produces: `t(key: TranslationKey): string`; routes `/login`, `/register`, `/logout`.
- Consumes: `registerUser`, `authenticate`, `createSession`, `destroySession`.

- [ ] **Step 1: i18n**

```ts
// app/i18n/he.ts
export const he = {
  "app.name": "פלטפורמת לימוד",
  "nav.subjects": "מקצועות",
  "nav.admin": "ניהול",
  "nav.logout": "התנתקות",
  "auth.username": "שם משתמש",
  "auth.email": "אימייל (לא חובה)",
  "auth.password": "סיסמה",
  "auth.login": "התחברות",
  "auth.register": "הרשמה",
  "auth.noAccount": "אין לך חשבון?",
  "auth.haveAccount": "כבר רשום?",
  "auth.loginFailed": "שם המשתמש או הסיסמה שגויים",
  "auth.registerFailed": "ההרשמה נכשלה. בדקו את הפרטים ונסו שוב.",
  "auth.registerRules":
    "שם משתמש: 3–32 תווים באנגלית, ספרות, נקודה, מקף או קו תחתון. סיסמה: 8 תווים לפחות.",
  "error.forbidden": "אין לך הרשאה לצפות בדף זה.",
  "error.ipBlocked": "הגישה מכתובת זו נחסמה זמנית עקב ניסיונות התחברות כושלים רבים.",
  "error.lessonLocked": "השיעור הזה עדיין נעול. סיימו את השיעור הקודם כדי לפתוח אותו.",
  "error.notFound": "הדף לא נמצא.",
  "error.generic": "אירעה שגיאה בלתי צפויה.",
  "subjects.title": "בחרו מקצוע",
  "subjects.enroll": "הצטרפות",
  "subjects.enrolled": "רשום",
  "subjects.open": "כניסה",
  "subject.locked": "נעול",
  "subject.completed": "הושלם",
  "subject.bestScore": "ציון מיטבי",
  "lesson.questionsPlaceholder": "כאן יופיעו שאלות התרגול בסוף השיעור.",
  "lesson.back": "חזרה למקצוע",
  "admin.title": "ניהול תוכן",
  "admin.todo": "עורך התוכן ייבנה בשלב הבא.",
  "admin.users.title": "ניהול משתמשים",
  "admin.users.todo": "ניהול המשתמשים ייבנה בשלב הבא.",
} as const;

export type TranslationKey = keyof typeof he;
```

```ts
// app/i18n/index.ts
import { he, type TranslationKey } from "./he";

// Single-language for now. To add a language: add a file like he.ts and switch here.
export function t(key: TranslationKey): string {
  return he[key];
}
export type { TranslationKey };
```

- [ ] **Step 2: Minimal client IP (replaced by full implementation in Task 4.1, same signature)**

```ts
// app/lib/auth/client-ip.server.ts
export function getClientIp(request: Request): string {
  // Placeholder until Task 4.1: socket IP is not available from a Request in react-router-serve,
  // so fall back to the first hop header or "unknown".
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
```

- [ ] **Step 3: Routes**

```ts
// app/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/public/login.tsx"),
  route("register", "routes/public/register.tsx"),
  route("logout", "routes/public/logout.tsx"),
] satisfies RouteConfig;
```

```tsx
// app/routes/public/login.tsx
import { Form, Link, data, redirect } from "react-router";
import type { Route } from "./+types/login";
import { t } from "~/i18n";
import { LoginSchema } from "~/lib/auth/validation";
import { authenticate } from "~/lib/auth/login.server";
import { createSession } from "~/lib/auth/session.server";
import { getClientIp } from "~/lib/auth/client-ip.server";

export async function action({ request }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  const parsed = LoginSchema.safeParse(form);
  if (!parsed.success) return data({ error: t("auth.loginFailed") }, { status: 400 });

  const result = await authenticate(parsed.data);
  if (!result.ok) return data({ error: t("auth.loginFailed") }, { status: 400 });

  const { cookie } = await createSession(result.userId, getClientIp(request));
  const url = new URL(request.url);
  const to = url.searchParams.get("redirectTo");
  const safeTo = to && to.startsWith("/") && !to.startsWith("//") ? to : "/subjects";
  return redirect(safeTo, { headers: { "Set-Cookie": cookie } });
}

export default function Login({ actionData }: Route.ComponentProps) {
  return (
    <main className="container">
      <h1>{t("auth.login")}</h1>
      <Form method="post">
        <label>
          {t("auth.username")}
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          {t("auth.password")}
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
        <button type="submit">{t("auth.login")}</button>
      </Form>
      <p>
        {t("auth.noAccount")} <Link to="/register">{t("auth.register")}</Link>
      </p>
    </main>
  );
}
```

```tsx
// app/routes/public/register.tsx
import { Form, Link, data, redirect } from "react-router";
import type { Route } from "./+types/register";
import { t } from "~/i18n";
import { RegisterSchema } from "~/lib/auth/validation";
import { registerUser } from "~/server/auth/register.server";
import { createSession } from "~/lib/auth/session.server";
import { getClientIp } from "~/lib/auth/client-ip.server";

export async function action({ request }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  const parsed = RegisterSchema.safeParse(form);
  if (!parsed.success) return data({ error: t("auth.registerFailed") }, { status: 400 });

  const result = await registerUser(parsed.data);
  if (!result.ok) return data({ error: t("auth.registerFailed") }, { status: 400 });

  const { cookie } = await createSession(result.userId, getClientIp(request));
  return redirect("/subjects", { headers: { "Set-Cookie": cookie } });
}

export default function Register({ actionData }: Route.ComponentProps) {
  return (
    <main className="container">
      <h1>{t("auth.register")}</h1>
      <p>{t("auth.registerRules")}</p>
      <Form method="post">
        <label>
          {t("auth.username")}
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          {t("auth.email")}
          <input name="email" type="email" autoComplete="email" />
        </label>
        <label>
          {t("auth.password")}
          <input name="password" type="password" autoComplete="new-password" required />
        </label>
        {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
        <button type="submit">{t("auth.register")}</button>
      </Form>
      <p>
        {t("auth.haveAccount")} <Link to="/login">{t("auth.login")}</Link>
      </p>
    </main>
  );
}
```

```tsx
// app/routes/public/logout.tsx
import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { destroySession } from "~/lib/auth/session.server";

export async function action({ request }: Route.ActionArgs) {
  const cookie = await destroySession(request);
  return redirect("/login", { headers: { "Set-Cookie": cookie } });
}

export async function loader() {
  return redirect("/login");
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run typecheck && npm run lint`, then `npm run dev`. Register at /register, confirm redirect to /subjects (404 for now is fine), check `__session` cookie in dev tools is HttpOnly. Submit the logout form via curl: `curl -i -X POST http://localhost:5173/logout -H "Cookie: __session=..."` → 302 with clearing cookie.

### Stage 3 checkpoint (stop here)

User can verify:

- `npm test` passes (password, session, register, login suites)
- Registering and logging in sets an HttpOnly `__session` cookie and inserts a `Session` row (see Prisma Studio)
- Wrong password and unknown username show the identical message

---

## Stage 4: Guard and brute-force protection

### Task 4.1: Trusted-proxy client IP

**Files:**

- Modify: `app/lib/auth/client-ip.server.ts`
- Create: `tests/auth/client-ip.test.ts`

**Interfaces:**

- Produces: `getClientIp(request: Request, opts?: { trustedProxyCount?: number; socketAddress?: string | null }): string`. Default `trustedProxyCount` from env.

Note: `react-router-serve` (Express under the hood) does not expose the socket address on the Fetch `Request`. With `TRUSTED_PROXY_COUNT=0` we therefore use the socket address when provided, else fall back to `"unknown"`, and the README documents that production should run behind a proxy with `TRUSTED_PROXY_COUNT=1`. The `socketAddress` parameter is the hook for a custom server later.

- [ ] **Step 1: Failing tests** (pins Review Focus 1)

```ts
// tests/auth/client-ip.test.ts
import { describe, expect, it } from "vitest";
import { getClientIp } from "~/lib/auth/client-ip.server";

const req = (xff?: string) =>
  new Request("http://x/", { headers: xff ? { "x-forwarded-for": xff } : {} });

describe("getClientIp", () => {
  it("with 0 trusted proxies ignores X-Forwarded-For entirely", () => {
    expect(getClientIp(req("1.1.1.1"), { trustedProxyCount: 0, socketAddress: "9.9.9.9" })).toBe(
      "9.9.9.9",
    );
    expect(getClientIp(req("1.1.1.1"), { trustedProxyCount: 0, socketAddress: null })).toBe(
      "unknown",
    );
  });
  it("with 1 trusted proxy takes the right-most entry", () => {
    expect(getClientIp(req("1.1.1.1, 2.2.2.2, 3.3.3.3"), { trustedProxyCount: 1 })).toBe("3.3.3.3");
  });
  it("with 2 trusted proxies takes the second from the right", () => {
    expect(getClientIp(req("1.1.1.1, 2.2.2.2, 3.3.3.3"), { trustedProxyCount: 2 })).toBe("2.2.2.2");
  });
  it("when fewer hops than trusted, uses the left-most available", () => {
    expect(getClientIp(req("5.5.5.5"), { trustedProxyCount: 3 })).toBe("5.5.5.5");
  });
  it("falls back to socket when header missing", () => {
    expect(getClientIp(req(), { trustedProxyCount: 1, socketAddress: "7.7.7.7" })).toBe("7.7.7.7");
  });
  it("normalizes IPv4-mapped IPv6 and trims", () => {
    expect(getClientIp(req(" ::ffff:8.8.8.8 "), { trustedProxyCount: 1 })).toBe("8.8.8.8");
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement**

```ts
// app/lib/auth/client-ip.server.ts
import { env } from "~/server/env.server";

/** Sentinel when no trustworthy IP is available. Never block this value. */
export const UNKNOWN_IP = "unknown";

export interface ClientIpOptions {
  trustedProxyCount?: number;
  socketAddress?: string | null;
}

function normalize(ip: string): string {
  const t = ip.trim();
  return t.startsWith("::ffff:") ? t.slice("::ffff:".length) : t;
}

/**
 * Resolve the client IP. X-Forwarded-For is only consulted when trustedProxyCount > 0,
 * and then we take the entry `trustedProxyCount` from the right, which is the address
 * appended by the first trusted proxy. Anything further left is client-controlled.
 */
export function getClientIp(request: Request, opts: ClientIpOptions = {}): string {
  const trusted = opts.trustedProxyCount ?? env.TRUSTED_PROXY_COUNT;
  const socket = opts.socketAddress ? normalize(opts.socketAddress) : null;
  if (trusted <= 0) return socket ?? "unknown";

  const header = request.headers.get("x-forwarded-for");
  if (!header) return socket ?? "unknown";
  const hops = header.split(",").map(normalize).filter(Boolean);
  if (hops.length === 0) return socket ?? "unknown";
  const idx = Math.max(0, hops.length - trusted);
  return hops[idx] ?? "unknown";
}
```

- [ ] **Step 4: Run, expect pass**

### Task 4.2: Security config, AuthLog, IpBlock, lockout-aware login

**Files:**

- Create: `app/config/security.server.ts`, `app/lib/auth/auth-log.server.ts`, `app/lib/auth/ip-block.server.ts`, `app/lib/auth/cleanup.server.ts`, `scripts/cleanup.ts`, `tests/auth/brute-force.test.ts`, `tests/auth/ip-block.test.ts`
- Modify: `app/lib/auth/login.server.ts` (add `login()` wrapper), `app/routes/public/login.tsx` (call `login`)

**Interfaces:**

- Produces:
  - `security` object: `{ failureWindowMs, usernameMaxFailures, usernameLockoutMs, ipMaxFailures, authLogRetentionMs, escalationMinutes: readonly number[], escalationLookbackMs }`.
  - `recordAuthAttempt(p: { ip: string; username: string; ok: boolean; reason?: LoginFailureReason }): Promise<void>`
  - `countRecentFailures(p: { ip?: string; username?: string; sinceMs: number }): Promise<number>`
  - `findActiveIpBlock(ip: string): Promise<IpBlock | null>`
  - `applyIpBlock(ip: string, reason: string): Promise<IpBlock>` — upsert with escalation (spec §10 step 4).
  - `cleanupSecurityTables(now?: Date): Promise<{ ipBlocks: number; authLogs: number }>`
  - `login(input: LoginInput, ip: string): Promise<AuthResult>` — the gated flow; always logs.

- [ ] **Step 1: security.server.ts**

```ts
// app/config/security.server.ts
import { env } from "./env.server";

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** Escalating IpBlock durations by strike number (1st, 2nd, 3rd, 4th+). Code, not env, by design. */
export const IP_BLOCK_ESCALATION_MINUTES = [15, 60, 360, 1440] as const;
/** How far back prior blocks count toward escalation (and how long expired rows are retained). */
export const IP_BLOCK_ESCALATION_LOOKBACK_DAYS = 7;

export const security = {
  failureWindowMs: env.AUTH_FAILURE_WINDOW_MINUTES * MIN,
  usernameMaxFailures: env.AUTH_USERNAME_MAX_FAILURES,
  usernameLockoutMs: env.AUTH_USERNAME_LOCKOUT_MINUTES * MIN,
  ipMaxFailures: env.AUTH_IP_MAX_FAILURES,
  authLogRetentionMs: env.AUTH_LOG_RETENTION_DAYS * DAY,
  escalationMinutes: IP_BLOCK_ESCALATION_MINUTES,
  escalationLookbackMs: IP_BLOCK_ESCALATION_LOOKBACK_DAYS * DAY,
} as const;

export function escalationDurationMs(strikeCount: number): number {
  const idx = Math.min(Math.max(strikeCount, 1), IP_BLOCK_ESCALATION_MINUTES.length) - 1;
  return (IP_BLOCK_ESCALATION_MINUTES[idx] ?? IP_BLOCK_ESCALATION_MINUTES[0]) * MIN;
}
```

- [ ] **Step 2: Failing tests for IpBlock escalation**

```ts
// tests/auth/ip-block.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { escalationDurationMs } from "~/config/security.server";
import { applyIpBlock, findActiveIpBlock } from "~/lib/auth/ip-block.server";
import { cleanupSecurityTables } from "~/lib/auth/cleanup.server";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";

describe("escalationDurationMs", () => {
  it("maps strikes to the table and clamps", () => {
    expect(escalationDurationMs(1)).toBe(15 * 60_000);
    expect(escalationDurationMs(2)).toBe(60 * 60_000);
    expect(escalationDurationMs(4)).toBe(1440 * 60_000);
    expect(escalationDurationMs(99)).toBe(1440 * 60_000);
    expect(escalationDurationMs(0)).toBe(15 * 60_000);
  });
});

describe("applyIpBlock", () => {
  beforeEach(resetDb);

  it("creates a first strike, then escalates in place keeping one row per IP", async () => {
    const b1 = await applyIpBlock("1.2.3.4", "test");
    expect(b1.strikeCount).toBe(1);
    const b2 = await applyIpBlock("1.2.3.4", "test");
    expect(b2.id).toBe(b1.id);
    expect(b2.strikeCount).toBe(2);
    expect(b2.expiresAt.getTime()).toBeGreaterThan(b1.expiresAt.getTime());
    expect(await prisma.ipBlock.count()).toBe(1);
  });

  it("resets strikes when the previous block is older than the lookback", async () => {
    const b1 = await applyIpBlock("1.2.3.4", "test");
    await prisma.ipBlock.update({
      where: { id: b1.id },
      data: {
        updatedAt: new Date(Date.now() - 8 * 86_400_000),
        expiresAt: new Date(Date.now() - 7 * 86_400_000),
      },
    });
    const b2 = await applyIpBlock("1.2.3.4", "test");
    expect(b2.strikeCount).toBe(1);
  });

  it("findActiveIpBlock ignores expired rows", async () => {
    const b = await applyIpBlock("1.2.3.4", "test");
    expect(await findActiveIpBlock("1.2.3.4")).not.toBeNull();
    await prisma.ipBlock.update({
      where: { id: b.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    expect(await findActiveIpBlock("1.2.3.4")).toBeNull();
  });
});

describe("cleanupSecurityTables", () => {
  beforeEach(resetDb);
  it("deletes only expired blocks past the lookback and old auth logs", async () => {
    const recentExpired = await applyIpBlock("1.1.1.1", "t");
    await prisma.ipBlock.update({
      where: { id: recentExpired.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    const oldExpired = await applyIpBlock("2.2.2.2", "t");
    await prisma.ipBlock.update({
      where: { id: oldExpired.id },
      data: {
        expiresAt: new Date(Date.now() - 1),
        updatedAt: new Date(Date.now() - 8 * 86_400_000),
      },
    });
    await prisma.authLog.createMany({
      data: [
        {
          ipAddress: "x",
          username: "a",
          isSuccessful: false,
          type: "login",
          createdAt: new Date(),
        },
        {
          ipAddress: "x",
          username: "a",
          isSuccessful: false,
          type: "login",
          createdAt: new Date(Date.now() - 40 * 86_400_000),
        },
      ],
    });
    const r = await cleanupSecurityTables();
    expect(r.ipBlocks).toBe(1);
    expect(r.authLogs).toBe(1);
    expect(await prisma.ipBlock.findUnique({ where: { ipAddress: "1.1.1.1" } })).not.toBeNull();
    expect(await prisma.ipBlock.findUnique({ where: { ipAddress: "2.2.2.2" } })).toBeNull();
  });
});
```

Note on `updatedAt`: Prisma's `@updatedAt` overwrites on update, so the test sets `updatedAt` explicitly in the same update call, which Prisma honors.

- [ ] **Step 3: Failing tests for the gated login flow**

```ts
// tests/auth/brute-force.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { security } from "~/config/security.server";
import { login } from "~/lib/auth/login.server";
import { registerUser } from "~/server/auth/register.server";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";

describe("login with brute-force protection", () => {
  beforeEach(async () => {
    await resetDb();
    await registerUser({ username: "alice", password: "password1" });
  });

  it("logs success and failure with reasons", async () => {
    await login({ username: "alice", password: "bad" }, "10.0.0.1");
    await login({ username: "alice", password: "password1" }, "10.0.0.1");
    const logs = await prisma.authLog.findMany({ orderBy: { id: "asc" } });
    expect(logs.map((l) => [l.isSuccessful, l.failureReason])).toEqual([
      [false, "BAD_PASSWORD"],
      [true, null],
    ]);
  });

  it("locks the username after N failures even with the right password", async () => {
    for (let i = 0; i < security.usernameMaxFailures; i++)
      await login({ username: "alice", password: "bad" }, `10.0.0.${i}`);
    const r = await login({ username: "alice", password: "password1" }, "10.0.0.99");
    expect(r).toEqual({ ok: false, reason: "USERNAME_LOCKED" });
  });

  it("does not lock other usernames", async () => {
    await registerUser({ username: "bob", password: "password1" });
    for (let i = 0; i < security.usernameMaxFailures; i++)
      await login({ username: "alice", password: "bad" }, `10.0.0.${i}`);
    expect((await login({ username: "bob", password: "password1" }, "10.0.0.99")).ok).toBe(true);
  });

  it("blocks the IP after M failures across many usernames and reports IP_BLOCKED next", async () => {
    for (let i = 0; i < security.ipMaxFailures; i++)
      await login({ username: `ghost${i}`, password: "bad" }, "10.9.9.9");
    expect(await prisma.ipBlock.findUnique({ where: { ipAddress: "10.9.9.9" } })).not.toBeNull();
    const r = await login({ username: "alice", password: "password1" }, "10.9.9.9");
    expect(r).toEqual({ ok: false, reason: "IP_BLOCKED" });
    const last = await prisma.authLog.findFirst({ orderBy: { id: "desc" } });
    expect(last?.failureReason).toBe("IP_BLOCKED");
  });

  it("M is strictly greater than N (shared school IP)", () => {
    expect(security.ipMaxFailures).toBeGreaterThan(security.usernameMaxFailures);
  });

  it("never creates an IpBlock for the 'unknown' IP but still logs attempts", async () => {
    for (let i = 0; i < security.ipMaxFailures + 2; i++)
      await login({ username: `ghost${i}`, password: "bad" }, "unknown");
    expect(await prisma.ipBlock.count()).toBe(0);
    expect(await prisma.authLog.count({ where: { ipAddress: "unknown" } })).toBe(
      security.ipMaxFailures + 2,
    );
    expect((await login({ username: "alice", password: "password1" }, "unknown")).ok).toBe(true);
  });
});
```

- [ ] **Step 4: Run both, expect failure**

- [ ] **Step 5: Implement auth-log, ip-block, cleanup, login**

```ts
// app/lib/auth/auth-log.server.ts
import { prisma } from "~/server/database.server";
import type { LoginFailureReason } from "./validation";

export async function recordAuthAttempt(p: {
  ip: string;
  username: string;
  ok: boolean;
  reason?: LoginFailureReason;
}) {
  await prisma.authLog.create({
    data: {
      ipAddress: p.ip,
      username: p.username,
      isSuccessful: p.ok,
      failureReason: p.ok ? null : (p.reason ?? null),
      type: "login",
    },
  });
}

export async function countRecentFailures(p: {
  ip?: string;
  username?: string;
  sinceMs: number;
}): Promise<number> {
  return prisma.authLog.count({
    where: {
      isSuccessful: false,
      type: "login",
      createdAt: { gte: new Date(Date.now() - p.sinceMs) },
      ...(p.ip ? { ipAddress: p.ip } : {}),
      ...(p.username ? { username: p.username } : {}),
    },
  });
}
```

```ts
// app/lib/auth/ip-block.server.ts
import { escalationDurationMs, security } from "~/config/security.server";
import { prisma } from "~/server/database.server";
import type { IpBlock } from "../../../prisma/generated/client";
import { UNKNOWN_IP } from "./client-ip.server";

export function findActiveIpBlock(ip: string): Promise<IpBlock | null> {
  return prisma.ipBlock.findFirst({ where: { ipAddress: ip, expiresAt: { gt: new Date() } } });
}

/** One row per IP. Repeat offenses within the lookback escalate in place; otherwise strikes reset. */
export async function applyIpBlock(ip: string, reason: string): Promise<IpBlock> {
  if (ip === UNKNOWN_IP)
    throw new Error("Refusing to block the 'unknown' IP sentinel; it would block every user");
  const now = Date.now();
  const existing = await prisma.ipBlock.findUnique({ where: { ipAddress: ip } });
  const withinLookback =
    existing !== null && now - existing.updatedAt.getTime() < security.escalationLookbackMs;
  const strikeCount = withinLookback ? existing.strikeCount + 1 : 1;
  const expiresAt = new Date(now + escalationDurationMs(strikeCount));
  return prisma.ipBlock.upsert({
    where: { ipAddress: ip },
    create: { ipAddress: ip, reason, strikeCount, expiresAt },
    update: { reason, strikeCount, expiresAt },
  });
}
```

```ts
// app/lib/auth/cleanup.server.ts
import { security } from "~/config/security.server";
import { prisma } from "~/server/database.server";

export async function cleanupSecurityTables(now: Date = new Date()) {
  const lookbackCutoff = new Date(now.getTime() - security.escalationLookbackMs);
  const retentionCutoff = new Date(now.getTime() - security.authLogRetentionMs);
  const [ipBlocks, authLogs] = await prisma.$transaction([
    prisma.ipBlock.deleteMany({
      where: { expiresAt: { lt: now }, updatedAt: { lt: lookbackCutoff } },
    }),
    prisma.authLog.deleteMany({ where: { createdAt: { lt: retentionCutoff } } }),
  ]);
  return { ipBlocks: ipBlocks.count, authLogs: authLogs.count };
}
```

```ts
// scripts/cleanup.ts
import "dotenv/config";
import { cleanupSecurityTables } from "../app/lib/auth/cleanup.server";
import { prisma } from "../app/server/database.server";

const r = await cleanupSecurityTables();
console.log(`Deleted ${r.ipBlocks} expired IP blocks and ${r.authLogs} old auth log rows.`);
await prisma.$disconnect();
```

Append to `login.server.ts`:

```ts
import { security } from "~/config/security.server";
import { countRecentFailures, recordAuthAttempt } from "./auth-log.server";
import { UNKNOWN_IP } from "./client-ip.server";
import { applyIpBlock, findActiveIpBlock } from "./ip-block.server";

/** Full login flow: IP block → username lockout → credentials → logging → IP block creation. */
export async function login(input: LoginInput, ip: string): Promise<AuthResult> {
  const fail = async (reason: LoginFailureReason): Promise<AuthResult> => {
    await recordAuthAttempt({ ip, username: input.username, ok: false, reason });
    if (ip !== UNKNOWN_IP) {
      const ipFailures = await countRecentFailures({ ip, sinceMs: security.failureWindowMs });
      if (ipFailures >= security.ipMaxFailures)
        await applyIpBlock(ip, `${ipFailures} failed logins in window`);
    }
    return { ok: false, reason };
  };

  if (await findActiveIpBlock(ip)) return fail("IP_BLOCKED");

  const userFailures = await countRecentFailures({
    username: input.username,
    sinceMs: security.usernameLockoutMs,
  });
  if (userFailures >= security.usernameMaxFailures) return fail("USERNAME_LOCKED");

  const result = await authenticate(input);
  if (!result.ok) return fail(result.reason);

  await recordAuthAttempt({ ip, username: input.username, ok: true });
  return result;
}
```

In `login.tsx`, replace `authenticate(parsed.data)` with `login(parsed.data, getClientIp(request))`.

- [ ] **Step 6: Run, expect pass** — `npx vitest run tests/auth`

### Task 4.3: Route guard middleware, roles, public allowlist

**Files:**

- Create: `app/lib/auth/roles.ts`, `app/config/public-routes.ts`, `app/middleware/auth.server.ts`, `app/lib/auth/context.server.ts`, `tests/auth/roles.test.ts`, `tests/auth/public-routes.test.ts`, `tests/auth/guard.test.ts`, `app/routes/app/layout.tsx`, `app/routes/app/subjects.tsx` (placeholder), `app/routes/admin/layout.tsx`, `app/routes/admin/index.tsx`, `app/routes/admin/users.tsx`
- Modify: `app/root.tsx` (export middleware + loader), `app/routes.ts`, `app/routes/home.tsx` (redirect to /subjects)

**Interfaces:**

- Produces:
  - `roles.ts`: `type Role = "USER" | "ADMIN" | "SYSTEM_ADMIN"`, `ROLE_RANK`, `hasRole(userRole: Role, min: Role): boolean`.
  - `context.server.ts`: `userContext = createContext<User | null>(null)`, `sessionContext = createContext<SessionWithUser | null>(null)`, `clientIpContext = createContext<string>("unknown")`, `requireUser(context): User`, `requireRole(context, min: Role): User` (throws 403 `data()`).
  - `public-routes.ts`: `isPublicPath(pathname: string): boolean`.
  - `authMiddleware: MiddlewareFunction`.

- [ ] **Step 1: Failing unit tests**

```ts
// tests/auth/roles.test.ts
import { describe, expect, it } from "vitest";
import { hasRole } from "~/shared/roles";

describe("hasRole", () => {
  it("is hierarchical", () => {
    expect(hasRole("USER", "USER")).toBe(true);
    expect(hasRole("USER", "ADMIN")).toBe(false);
    expect(hasRole("ADMIN", "USER")).toBe(true);
    expect(hasRole("ADMIN", "SYSTEM_ADMIN")).toBe(false);
    expect(hasRole("SYSTEM_ADMIN", "ADMIN")).toBe(true);
  });
});
```

```ts
// tests/auth/public-routes.test.ts
import { describe, expect, it } from "vitest";
import { isPublicPath } from "~/config/public-routes";

describe("isPublicPath", () => {
  it("allows login/register/logout, assets, favicon, build files", () => {
    for (const p of [
      "/login",
      "/register",
      "/logout",
      "/login.data",
      "/assets/abc.png",
      "/favicon.ico",
      "/@vite/client",
      "/app/root.tsx",
    ]) {
      expect(isPublicPath(p), p).toBe(true);
    }
  });
  it("denies everything else", () => {
    for (const p of ["/", "/subjects", "/admin", "/loginx", "/subjects.data"])
      expect(isPublicPath(p), p).toBe(false);
  });
});
```

```ts
// tests/auth/guard.test.ts  (pins Review Focus 4)
import { beforeEach, describe, expect, it } from "vitest";
import { RouterContextProvider } from "react-router";
import { authMiddleware } from "~/middleware/auth.server";
import { userContext } from "~/server/auth/context.server";
import { createSession } from "~/lib/auth/session.server";
import { registerUser } from "~/server/auth/register.server";
import { applyIpBlock } from "~/lib/auth/ip-block.server";
import { prisma } from "~/server/database.server";
import { requestWithCookie, resetDb } from "../helpers/db";

async function run(request: Request) {
  const context = new RouterContextProvider();
  const next = async () => new Response("ok");
  try {
    const res = await authMiddleware(
      { request, context, params: {}, unstable_pattern: "" } as never,
      next,
    );
    return { res: res as Response, context, thrown: null as Response | null };
  } catch (e) {
    return { res: null, context, thrown: e as Response };
  }
}

describe("authMiddleware", () => {
  let cookie: string;
  let userId: number;
  beforeEach(async () => {
    await resetDb();
    const r = await registerUser({ username: "alice", password: "password1" });
    if (!r.ok) throw new Error();
    userId = r.userId;
    cookie = (await createSession(userId, null)).cookie;
  });

  it("lets public paths through without a session", async () => {
    const { res } = await run(new Request("http://x/login"));
    expect(res?.status).toBe(200);
  });

  it("redirects to login with redirectTo when no session", async () => {
    const { thrown } = await run(new Request("http://x/subjects/abc"));
    expect(thrown?.status).toBe(302);
    expect(thrown?.headers.get("Location")).toBe("/login?redirectTo=%2Fsubjects%2Fabc");
  });

  it("sets user context when session valid", async () => {
    const { res, context } = await run(requestWithCookie("http://x/subjects", cookie));
    expect(res?.status).toBe(200);
    expect(context.get(userContext)?.id).toBe(userId);
  });

  it("rejects expired session, deletes it, clears cookie", async () => {
    await prisma.session.updateMany({ data: { expirationDate: new Date(Date.now() - 1) } });
    const { thrown } = await run(requestWithCookie("http://x/subjects", cookie));
    expect(thrown?.status).toBe(302);
    expect(thrown?.headers.get("Set-Cookie")).toMatch(/Max-Age=0/);
    expect(await prisma.session.count()).toBe(0);
  });

  it("rejects a disabled user with a valid session", async () => {
    await prisma.user.update({ where: { id: userId }, data: { isDisabled: true } });
    const { thrown } = await run(requestWithCookie("http://x/subjects", cookie));
    expect(thrown?.status).toBe(302);
    expect(await prisma.session.count()).toBe(0);
  });

  it("returns 403 for a blocked IP even on public paths", async () => {
    await applyIpBlock("5.5.5.5", "test");
    const req = new Request("http://x/login", { headers: { "x-forwarded-for": "5.5.5.5" } });
    const { thrown } = await run(req);
    expect(thrown?.status).toBe(403);
  });
});
```

The IP-block test relies on `TRUSTED_PROXY_COUNT=1` in the test environment; add `process.env.TRUSTED_PROXY_COUNT ??= "1";` to `tests/setup.ts`.

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement**

```ts
// app/lib/auth/roles.ts  (shared)
export type Role = "USER" | "ADMIN" | "SYSTEM_ADMIN";
export const ROLE_RANK: Record<Role, number> = { USER: 0, ADMIN: 1, SYSTEM_ADMIN: 2 };
export function hasRole(userRole: Role, min: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[min];
}
```

```ts
// app/config/public-routes.ts  (shared)
/** Paths reachable without a session. Everything else is guarded. */
const EXACT = new Set(["/login", "/register", "/logout", "/favicon.ico"]);
const PREFIXES = [
  "/assets/",
  "/@vite/",
  "/@fs/",
  "/app/",
  "/node_modules/",
  "/@react-router/",
  "/__manifest",
];

export function isPublicPath(pathname: string): boolean {
  const base = pathname.endsWith(".data") ? pathname.slice(0, -".data".length) : pathname;
  if (EXACT.has(base)) return true;
  return PREFIXES.some((p) => pathname.startsWith(p));
}
```

```ts
// app/lib/auth/context.server.ts
import { createContext, data, type RouterContextProvider } from "react-router";
import type { User } from "../../../prisma/generated/client";
import { t } from "~/i18n";
import { hasRole, type Role } from "./roles";
import type { SessionWithUser } from "./session.server";

export const userContext = createContext<User | null>(null);
export const sessionContext = createContext<SessionWithUser | null>(null);
export const clientIpContext = createContext<string>("unknown");

export function requireUser(context: RouterContextProvider): User {
  const user = context.get(userContext);
  if (!user) throw data(t("error.forbidden"), { status: 403 });
  return user;
}

export function requireRole(context: RouterContextProvider, min: Role): User {
  const user = requireUser(context);
  if (!hasRole(user.role, min)) throw data(t("error.forbidden"), { status: 403 });
  return user;
}
```

```ts
// app/middleware/auth.server.ts
import { data, redirect, type MiddlewareFunction } from "react-router";
import { isPublicPath } from "~/config/public-routes";
import { t } from "~/i18n";
import { getClientIp } from "~/lib/auth/client-ip.server";
import { clientIpContext, sessionContext, userContext } from "~/server/auth/context.server";
import { findActiveIpBlock } from "~/lib/auth/ip-block.server";
import { getSessionFromRequest, sessionCookie, touchSession } from "~/lib/auth/session.server";

export const authMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
  const ip = getClientIp(request);
  context.set(clientIpContext, ip);

  if (await findActiveIpBlock(ip)) {
    throw data(t("error.ipBlocked"), { status: 403 });
  }

  const url = new URL(request.url);
  if (isPublicPath(url.pathname)) return next();

  const session = await getSessionFromRequest(request);
  if (!session) {
    const redirectTo = url.pathname + url.search;
    throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, {
      headers: { "Set-Cookie": await sessionCookie.serialize("", { maxAge: 0 }) },
    });
  }

  await touchSession(session);
  context.set(sessionContext, session);
  context.set(userContext, session.user);
  return next();
};
```

Root changes:

```tsx
// app/root.tsx  (add near the top; keep Layout/App/ErrorBoundary as-is)
import type { Route } from "./+types/root";
import { authMiddleware } from "~/middleware/auth.server";

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

// A loader forces the middleware to run on every client-side navigation too.
export async function loader() {
  return null;
}
```

Routes and layouts:

```ts
// app/routes.ts
import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/public/login.tsx"),
  route("register", "routes/public/register.tsx"),
  route("logout", "routes/public/logout.tsx"),
  layout("routes/app/layout.tsx", [route("subjects", "routes/app/subjects.tsx")]),
  ...prefix("admin", [
    layout("routes/admin/layout.tsx", [
      index("routes/admin/index.tsx"),
      route("users", "routes/admin/users.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
```

```tsx
// app/routes/home.tsx
import { redirect } from "react-router";
export function loader() {
  return redirect("/subjects");
}
```

```tsx
// app/routes/app/layout.tsx
import { Form, Link, Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { t } from "~/i18n";
import { requireUser } from "~/server/auth/context.server";
import { hasRole } from "~/shared/roles";

export async function loader({ context }: Route.LoaderArgs) {
  const user = requireUser(context);
  return { username: user.username, isAdmin: hasRole(user.role, "ADMIN") };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <header className="container nav">
        <Link to="/subjects">{t("app.name")}</Link>
        <nav>
          <Link to="/subjects">{t("nav.subjects")}</Link>
          {loaderData.isAdmin ? <Link to="/admin">{t("nav.admin")}</Link> : null}
          <span>{loaderData.username}</span>
          <Form method="post" action="/logout">
            <button type="submit">{t("nav.logout")}</button>
          </Form>
        </nav>
      </header>
      <Outlet />
    </>
  );
}
```

```tsx
// app/routes/app/subjects.tsx  (placeholder; real version in Stage 7)
import { t } from "~/i18n";
export default function Subjects() {
  return (
    <main className="container">
      <h1>{t("subjects.title")}</h1>
    </main>
  );
}
```

```tsx
// app/routes/admin/layout.tsx
import { Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { requireRole } from "~/server/auth/context.server";

export async function loader({ context }: Route.LoaderArgs) {
  requireRole(context, "ADMIN");
  return null;
}
export default function AdminLayout() {
  return <Outlet />;
}
```

```tsx
// app/routes/admin/index.tsx
import { t } from "~/i18n";
// TODO(content-editor): ADMIN content editing UI plugs in here.
export default function AdminIndex() {
  return (
    <main className="container">
      <h1>{t("admin.title")}</h1>
      <p>{t("admin.todo")}</p>
    </main>
  );
}
```

```tsx
// app/routes/admin/users.tsx
import type { Route } from "./+types/users";
import { t } from "~/i18n";
import { requireRole } from "~/server/auth/context.server";

export async function loader({ context }: Route.LoaderArgs) {
  requireRole(context, "SYSTEM_ADMIN");
  return null;
}
// TODO(user-management): SYSTEM_ADMIN user/role/disable management plugs in here.
export default function AdminUsers() {
  return (
    <main className="container">
      <h1>{t("admin.users.title")}</h1>
      <p>{t("admin.users.todo")}</p>
    </main>
  );
}
```

- [ ] **Step 4: Run, expect pass** — `npx vitest run tests/auth`

- [ ] **Step 5: Manual verification**

`npm run dev`; unauthenticated `/subjects` → redirected to `/login?redirectTo=%2Fsubjects`; after login lands on `/subjects`; `/admin` as USER → 403 page; promote user in Prisma Studio to ADMIN → `/admin` works, `/admin/users` → 403; SYSTEM_ADMIN → both work.

### Stage 4 checkpoint (stop here)

User can verify:

- `npm test` passes (client-ip, ip-block, brute-force, roles, public-routes, guard)
- Six wrong passwords lock the account for 15 minutes with the generic message; AuthLog rows show reasons
- `npm run cleanup` runs and prints counts
- Role gating on `/admin` and `/admin/users` behaves per role

---

## Stage 5: Content blocks and rendering

### Task 5.1: Block schema and direction resolution

**Files:**

- Create: `app/lib/content/blocks.ts`, `app/lib/content/direction.ts`, `app/lib/content/lesson-content.server.ts`, `tests/content/blocks.test.ts`, `tests/content/direction.test.ts`

**Interfaces:**

- Produces: zod schemas `HeadingBlock, ParagraphBlock, QuoteBlock, ImageBlock, ListBlock, ContentBlock, LessonContent`; types `ContentBlock`, `LessonContent`, `RichText`, `InlineSpan`, `TextDirection = "rtl" | "ltr"`; `resolveDirection(subjectDir, blockDir?)`; `parseLessonContent(json: unknown): LessonContent` (throws `LessonContentError`), `serializeLessonContent(blocks: LessonContent): unknown`.

- [ ] **Step 1: Failing tests** (pins Review Focus 5)

```ts
// tests/content/blocks.test.ts
import { describe, expect, it } from "vitest";
import { ContentBlock, LessonContent } from "~/schemas/content-blocks";

const ok = (b: unknown) => expect(ContentBlock.safeParse(b).success, JSON.stringify(b)).toBe(true);
const bad = (b: unknown) =>
  expect(ContentBlock.safeParse(b).success, JSON.stringify(b)).toBe(false);

describe("ContentBlock", () => {
  it("accepts each block type", () => {
    ok({ id: "a", type: "heading", level: 2, text: "Hi" });
    ok({ id: "b", type: "paragraph", content: [{ text: "x", marks: ["bold", "highlight"] }] });
    ok({
      id: "c",
      type: "quote",
      text: "hello world",
      reference: "Ref 1:1",
      sourceLabel: "Source",
      highlights: [{ start: 0, end: 5 }],
    });
    ok({ id: "d", type: "image", assetId: 1, alt: "desc" });
    ok({ id: "e", type: "list", ordered: true, items: [[{ text: "one" }]] });
  });
  it("applies defaults for marks and highlights", () => {
    const p = ContentBlock.parse({ id: "b", type: "paragraph", content: [{ text: "x" }] });
    expect(p.type === "paragraph" && p.content[0]?.marks).toEqual([]);
    const q = ContentBlock.parse({ id: "c", type: "quote", text: "t" });
    expect(q.type === "quote" && q.highlights).toEqual([]);
  });
  it("accepts a per-block dir override and rejects bad values", () => {
    ok({ id: "a", type: "heading", level: 1, text: "x", dir: "ltr" });
    bad({ id: "a", type: "heading", level: 1, text: "x", dir: "auto" });
  });
  it("rejects unknown type, missing alt, bad heading level, bad mark", () => {
    bad({ id: "z", type: "video", url: "x" });
    bad({ id: "d", type: "image", assetId: 1, alt: "" });
    bad({ id: "a", type: "heading", level: 4, text: "x" });
    bad({ id: "b", type: "paragraph", content: [{ text: "x", marks: ["underline"] }] });
  });
  it("rejects highlight ranges that are inverted or exceed the text", () => {
    bad({ id: "c", type: "quote", text: "short", highlights: [{ start: 3, end: 2 }] });
    bad({ id: "c", type: "quote", text: "short", highlights: [{ start: 0, end: 99 }] });
  });
  it("LessonContent requires an array", () => {
    expect(LessonContent.safeParse({}).success).toBe(false);
    expect(LessonContent.safeParse([]).success).toBe(true);
  });
});
```

```ts
// tests/content/direction.test.ts
import { describe, expect, it } from "vitest";
import { resolveDirection } from "~/shared/direction";

describe("resolveDirection", () => {
  it("uses the block override when present, else the subject direction", () => {
    expect(resolveDirection("rtl", undefined)).toBe("rtl");
    expect(resolveDirection("rtl", "ltr")).toBe("ltr");
    expect(resolveDirection("ltr", "rtl")).toBe("rtl");
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement**

```ts
// app/lib/content/direction.ts  (shared)
export type TextDirection = "rtl" | "ltr";
export function resolveDirection(
  subjectDir: TextDirection,
  blockDir?: TextDirection,
): TextDirection {
  return blockDir ?? subjectDir;
}
```

```ts
// app/lib/content/blocks.ts  (shared; no server imports)
import { z } from "zod";

export const Direction = z.enum(["rtl", "ltr"]);
export const InlineMark = z.enum(["bold", "italic", "highlight"]);
export const InlineSpan = z.object({ text: z.string(), marks: z.array(InlineMark).default([]) });
export const RichText = z.array(InlineSpan);

const Base = z.object({
  id: z.string().min(1),
  /** Per-block direction override. Omit to inherit the subject's direction. */
  dir: Direction.optional(),
});

export const HeadingBlock = Base.extend({
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string(),
});

export const ParagraphBlock = Base.extend({ type: z.literal("paragraph"), content: RichText });

const HighlightRange = z.object({ start: z.number().int().min(0), end: z.number().int().min(0) });

export const QuoteBlock = Base.extend({
  type: z.literal("quote"),
  text: z.string(),
  reference: z.string().optional(),
  sourceLabel: z.string().optional(),
  highlights: z.array(HighlightRange).default([]),
}).superRefine((q, ctx) => {
  q.highlights.forEach((h, i) => {
    if (h.start > h.end)
      ctx.addIssue({ code: "custom", message: "start > end", path: ["highlights", i] });
    if (h.end > q.text.length)
      ctx.addIssue({ code: "custom", message: "range exceeds text", path: ["highlights", i] });
  });
});

export const ImageBlock = Base.extend({
  type: z.literal("image"),
  assetId: z.number().int().positive(),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

export const ListBlock = Base.extend({
  type: z.literal("list"),
  ordered: z.boolean(),
  items: z.array(RichText),
});

// To add a block type: define it above, add it here, add a renderer in
// app/components/lesson-content/blocks/, and register it in LessonContent.tsx.
export const ContentBlock = z.discriminatedUnion("type", [
  HeadingBlock,
  ParagraphBlock,
  QuoteBlock,
  ImageBlock,
  ListBlock,
]);
export const LessonContent = z.array(ContentBlock);

export type InlineSpan = z.infer<typeof InlineSpan>;
export type RichText = z.infer<typeof RichText>;
export type ContentBlock = z.infer<typeof ContentBlock>;
export type ContentBlockType = ContentBlock["type"];
export type LessonContent = z.infer<typeof LessonContent>;
```

Note: zod 4 `discriminatedUnion` accepts schemas wrapped by `superRefine` as long as the discriminator remains a literal. If the installed zod version rejects it, move the highlight check into `parseLessonContent` as a post-parse validation and keep the test.

```ts
// app/lib/content/lesson-content.server.ts
import { LessonContent as LessonContentSchema, type LessonContent } from "./blocks";

export class LessonContentError extends Error {
  constructor(public readonly issues: unknown) {
    super("Invalid lesson content");
  }
}

/** Every read of Lesson.content goes through here. */
export function parseLessonContent(json: unknown): LessonContent {
  const r = LessonContentSchema.safeParse(json);
  if (!r.success) throw new LessonContentError(r.error.issues);
  return r.data;
}

/** Every write of Lesson.content goes through here (validates before persisting). */
export function serializeLessonContent(blocks: LessonContent): LessonContent {
  return LessonContentSchema.parse(blocks);
}
```

- [ ] **Step 4: Run, expect pass**

### Task 5.2: Renderer components and lesson page

**Files:**

- Create: `app/components/lesson-content/RichText.tsx`, `blocks/Heading.tsx`, `blocks/Paragraph.tsx`, `blocks/Quote.tsx`, `blocks/Image.tsx`, `blocks/List.tsx`, `LessonContent.tsx`, `app/components/QuestionsPlaceholder.tsx`, `tests/content/render.test.tsx`
- Modify: `app/app.css`, `vitest.config.ts` (jsdom for tsx tests), `package.json` (add `jsdom`, `@testing-library/react` dev deps)

**Interfaces:**

- Produces: `<LessonContent blocks direction assetUrls />` where `assetUrls: Record<number, string>`; each block renderer `({ block, direction }: { block: Extract<ContentBlock, {type: T}>; direction: TextDirection })`.

- [ ] **Step 1: Install test deps**

Run: `npm i -D jsdom @testing-library/react @testing-library/dom`

Add to `vitest.config.ts` test options: `environmentMatchGlobs: [["tests/**/*.test.tsx", "jsdom"]]`.

- [ ] **Step 2: Failing render tests** (pins Review Focus 2 at the component level)

```tsx
// tests/content/render.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LessonContent } from "~/components/lesson-content/LessonContent";
import type { LessonContent as Blocks } from "~/schemas/content-blocks";

const blocks: Blocks = [
  { id: "h", type: "heading", level: 2, text: "Title" },
  {
    id: "p",
    type: "paragraph",
    content: [
      { text: "plain ", marks: [] },
      { text: "bold", marks: ["bold"] },
      { text: " hi", marks: ["highlight"] },
    ],
  },
  {
    id: "q",
    type: "quote",
    text: "hello world",
    reference: "Ref",
    sourceLabel: "Src",
    highlights: [{ start: 6, end: 11 }],
  },
  { id: "i", type: "image", assetId: 7, alt: "An image", caption: "Cap" },
  {
    id: "l",
    type: "list",
    ordered: false,
    items: [[{ text: "one", marks: [] }], [{ text: "two", marks: [] }]],
  },
  { id: "o", type: "paragraph", dir: "ltr", content: [{ text: "override", marks: [] }] },
];

describe("LessonContent", () => {
  it("renders every block type with the subject direction", () => {
    const { container } = render(
      <LessonContent blocks={blocks} direction="rtl" assetUrls={{ 7: "/assets/x.png" }} />,
    );
    expect(container.firstElementChild?.getAttribute("dir")).toBe("rtl");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Title");
    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("mark")).toHaveTextContent("hi");
    const quote = container.querySelector("blockquote")!;
    expect(quote.querySelector("mark")).toHaveTextContent("world");
    expect(quote).toHaveTextContent("Ref");
    expect(quote).toHaveTextContent("Src");
    expect(screen.getByAltText("An image").getAttribute("src")).toBe("/assets/x.png");
    expect(screen.getByText("Cap")).toBeTruthy();
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
  });
  it("applies a per-block dir override", () => {
    const { container } = render(<LessonContent blocks={blocks} direction="rtl" assetUrls={{}} />);
    const override = Array.from(container.querySelectorAll("p")).find(
      (p) => p.textContent === "override",
    );
    expect(override?.getAttribute("dir")).toBe("ltr");
  });
  it("renders a fallback for an image whose asset URL is missing", () => {
    const { container } = render(
      <LessonContent blocks={[blocks[3]!]} direction="ltr" assetUrls={{}} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("An image")).toBeTruthy();
  });
});
```

Add `import "@testing-library/jest-dom/vitest";` to `tests/setup.ts` and install `@testing-library/jest-dom`.

- [ ] **Step 3: Run, expect failure**

- [ ] **Step 4: Implement components**

```tsx
// app/components/lesson-content/RichText.tsx
import type { RichText as RichTextT } from "~/schemas/content-blocks";

export function RichText({ content }: { content: RichTextT }) {
  return (
    <>
      {content.map((span, i) => {
        let node: React.ReactNode = span.text;
        if (span.marks.includes("bold")) node = <strong>{node}</strong>;
        if (span.marks.includes("italic")) node = <em>{node}</em>;
        if (span.marks.includes("highlight")) node = <mark>{node}</mark>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}
```

```tsx
// app/components/lesson-content/blocks/Heading.tsx
import type { BlockProps } from "../types";
export function Heading({ block, dirAttr }: BlockProps<"heading">) {
  const Tag = `h${block.level}` as const;
  return (
    <Tag dir={dirAttr} className="block block-heading">
      {block.text}
    </Tag>
  );
}
```

```tsx
// app/components/lesson-content/blocks/Paragraph.tsx
import { RichText } from "../RichText";
import type { BlockProps } from "../types";
export function Paragraph({ block, dirAttr }: BlockProps<"paragraph">) {
  return (
    <p dir={dirAttr} className="block block-paragraph">
      <RichText content={block.content} />
    </p>
  );
}
```

```tsx
// app/components/lesson-content/blocks/Quote.tsx
import type { BlockProps } from "../types";

function segments(text: string, highlights: { start: number; end: number }[]) {
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const out: { text: string; hl: boolean }[] = [];
  let pos = 0;
  for (const h of sorted) {
    if (h.start > pos) out.push({ text: text.slice(pos, h.start), hl: false });
    out.push({ text: text.slice(h.start, h.end), hl: true });
    pos = h.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), hl: false });
  return out;
}

export function Quote({ block, dirAttr }: BlockProps<"quote">) {
  return (
    <blockquote dir={dirAttr} className="block block-quote">
      {block.sourceLabel ? <span className="quote-label">{block.sourceLabel}</span> : null}
      <p>
        {segments(block.text, block.highlights).map((s, i) =>
          s.hl ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>,
        )}
      </p>
      {block.reference ? <cite>{block.reference}</cite> : null}
    </blockquote>
  );
}
```

```tsx
// app/components/lesson-content/blocks/Image.tsx
import type { BlockProps } from "../types";
export function Image({ block, dirAttr, assetUrls }: BlockProps<"image">) {
  const src = assetUrls[block.assetId];
  return (
    <figure dir={dirAttr} className="block block-image">
      {src ? (
        <img src={src} alt={block.alt} />
      ) : (
        <div className="image-missing" role="img" aria-label={block.alt}>
          {block.alt}
        </div>
      )}
      {block.caption ? <figcaption>{block.caption}</figcaption> : null}
    </figure>
  );
}
```

```tsx
// app/components/lesson-content/blocks/List.tsx
import { RichText } from "../RichText";
import type { BlockProps } from "../types";
export function List({ block, dirAttr }: BlockProps<"list">) {
  const Tag = block.ordered ? "ol" : "ul";
  return (
    <Tag dir={dirAttr} className="block block-list">
      {block.items.map((item, i) => (
        <li key={i}>
          <RichText content={item} />
        </li>
      ))}
    </Tag>
  );
}
```

```ts
// app/components/lesson-content/types.ts
import type { ContentBlock, ContentBlockType } from "~/schemas/content-blocks";
import type { TextDirection } from "~/shared/direction";

export type BlockOf<T extends ContentBlockType> = Extract<ContentBlock, { type: T }>;
export interface BlockProps<T extends ContentBlockType> {
  block: BlockOf<T>;
  /** Resolved direction for this block. */
  direction: TextDirection;
  /** `dir` attribute to emit: set only when the block overrides the subject direction. */
  dirAttr: TextDirection | undefined;
  assetUrls: Record<number, string>;
}
```

```tsx
// app/components/lesson-content/LessonContent.tsx
import type {
  ContentBlock,
  ContentBlockType,
  LessonContent as Blocks,
} from "~/schemas/content-blocks";
import { resolveDirection, type TextDirection } from "~/shared/direction";
import type { BlockProps } from "./types";
import { Heading } from "./blocks/Heading";
import { Paragraph } from "./blocks/Paragraph";
import { Quote } from "./blocks/Quote";
import { Image } from "./blocks/Image";
import { List } from "./blocks/List";

// Exhaustive: adding a type to ContentBlock without a renderer here is a compile error.
const RENDERERS: { [T in ContentBlockType]: React.FC<BlockProps<T>> } = {
  heading: Heading,
  paragraph: Paragraph,
  quote: Quote,
  image: Image,
  list: List,
};

function renderBlock(
  block: ContentBlock,
  subjectDir: TextDirection,
  assetUrls: Record<number, string>,
) {
  const direction = resolveDirection(subjectDir, block.dir);
  const dirAttr = block.dir ? direction : undefined;
  // The cast is safe: RENDERERS is keyed by the same discriminant as `block.type`.
  const Renderer = RENDERERS[block.type] as React.FC<BlockProps<ContentBlockType>>;
  return (
    <Renderer
      key={block.id}
      block={block}
      direction={direction}
      dirAttr={dirAttr}
      assetUrls={assetUrls}
    />
  );
}

export function LessonContent({
  blocks,
  direction,
  assetUrls,
}: {
  blocks: Blocks;
  direction: TextDirection;
  assetUrls: Record<number, string>;
}) {
  return (
    <div dir={direction} className="lesson-content">
      {blocks.map((b) => renderBlock(b, direction, assetUrls))}
    </div>
  );
}
```

```tsx
// app/components/QuestionsPlaceholder.tsx
import { t } from "~/i18n";
// TODO(quiz): replace with the question runner that calls recordAttempt() on submit.
export function QuestionsPlaceholder() {
  return (
    <section className="questions-placeholder" aria-live="polite">
      <p>{t("lesson.questionsPlaceholder")}</p>
    </section>
  );
}
```

Add to `app.css`:

```css
.lesson-content {
  line-height: 1.7;
}
.block {
  margin-block: 1rem;
}
.block-quote {
  border-inline-start: 4px solid #999;
  padding-inline-start: 1rem;
  margin-inline: 0;
}
.quote-label {
  display: block;
  font-size: 0.85em;
  opacity: 0.7;
}
.block-image img {
  max-width: 100%;
  height: auto;
}
.image-missing {
  padding: 1rem;
  border: 1px dashed #999;
}
mark {
  background: #ffe58a;
}
.questions-placeholder {
  margin-block-start: 2rem;
  padding: 1rem;
  border: 1px dashed #999;
}
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.nav nav {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.locked {
  opacity: 0.5;
}
```

- [ ] **Step 5: Run, expect pass** — `npx vitest run tests/content`

### Stage 5 checkpoint (stop here)

User can verify:

- `npm test` passes (blocks, direction, render)
- `npm run typecheck` passes; temporarily add a `z.literal("table")` block to the union and confirm `LessonContent.tsx` fails to compile until a renderer is registered, then revert

---

## Stage 6: Progression logic and storage

> Folder layout changed after Stage 5 (see spec §4): pure code → `app/shared/`, server code → `app/server/<domain>/`, schemas → `app/schemas/`. Paths below were updated accordingly.

### Task 6.1: Unlock computation (pure) and subject tree

**Files:**

- Create: `app/shared/unlock.ts` (pure, shared), `app/server/progress/unlock.server.ts`, `tests/progress/unlock.test.ts`

**Interfaces:**

- Produces (pure):
  ```ts
  interface LessonNode { id: number; title: string; sortOrder: number; passingScore: number | null }
  interface SectionNode { id: number; title: string; sortOrder: number; lessons: LessonNode[] }
  interface ProgressRow { lessonId: number; bestScore: number; completedAt: Date | null }
  interface LessonState extends LessonNode { unlocked: boolean; completed: boolean; bestScore: number | null }
  interface SectionState extends Omit<SectionNode, "lessons"> { unlocked: boolean; completed: boolean; lessons: LessonState[] }
  computeTree(sections: SectionNode[], progress: ProgressRow[]): SectionState[]
  isLessonUnlocked(tree: SectionState[], lessonId: number): boolean
  ```
- Produces (server): `getSubjectTree(userId: number, subjectId: number): Promise<SectionState[]>`.

- [ ] **Step 1: Failing tests** (pins Review Focus 3)

```ts
// tests/progress/unlock.test.ts
import { describe, expect, it } from "vitest";
import { computeTree, isLessonUnlocked, type SectionNode } from "~/shared/unlock";

const L = (id: number, sortOrder: number) => ({
  id,
  title: `L${id}`,
  sortOrder,
  passingScore: null,
});
const sections: SectionNode[] = [
  { id: 1, title: "S1", sortOrder: 1, lessons: [L(11, 1), L(12, 2)] },
  { id: 2, title: "S2", sortOrder: 2, lessons: [L(21, 1), L(22, 3)] }, // gap in sortOrder on purpose
  { id: 3, title: "S3", sortOrder: 5, lessons: [] }, // empty section, gap in section order
  { id: 4, title: "S4", sortOrder: 6, lessons: [L(41, 1)] },
];
const done = (lessonId: number) => ({ lessonId, bestScore: 100, completedAt: new Date() });

describe("computeTree", () => {
  it("unlocks only the first lesson of the first section with no progress", () => {
    const t = computeTree(sections, []);
    expect(t[0]!.unlocked).toBe(true);
    expect(t[0]!.lessons.map((l) => l.unlocked)).toEqual([true, false]);
    expect(t[1]!.unlocked).toBe(false);
    expect(t[1]!.lessons.every((l) => !l.unlocked)).toBe(true);
  });
  it("unlocks the next lesson when the previous one is completed", () => {
    const t = computeTree(sections, [done(11)]);
    expect(t[0]!.lessons.map((l) => l.unlocked)).toEqual([true, true]);
    expect(t[1]!.unlocked).toBe(false);
  });
  it("unlocks the next section when all lessons of the previous are completed, using order not arithmetic", () => {
    const t = computeTree(sections, [done(11), done(12)]);
    expect(t[1]!.unlocked).toBe(true);
    expect(t[1]!.lessons.map((l) => l.unlocked)).toEqual([true, false]);
    expect(t[1]!.lessons[1]!.sortOrder).toBe(3);
  });
  it("treats an empty section as completed so it does not dead-end progression", () => {
    const t = computeTree(sections, [done(11), done(12), done(21), done(22)]);
    expect(t[2]!.unlocked).toBe(true);
    expect(t[2]!.completed).toBe(true);
    expect(t[3]!.unlocked).toBe(true);
    expect(t[3]!.lessons[0]!.unlocked).toBe(true);
  });
  it("a failed attempt records bestScore but does not complete or unlock", () => {
    const t = computeTree(sections, [{ lessonId: 11, bestScore: 40, completedAt: null }]);
    expect(t[0]!.lessons[0]).toMatchObject({ completed: false, bestScore: 40 });
    expect(t[0]!.lessons[1]!.unlocked).toBe(false);
  });
  it("sorts sections and lessons by sortOrder regardless of input order", () => {
    const shuffled = [
      sections[3]!,
      sections[0]!,
      sections[2]!,
      { ...sections[1]!, lessons: [...sections[1]!.lessons].reverse() },
    ];
    const t = computeTree(shuffled, []);
    expect(t.map((s) => s.id)).toEqual([1, 2, 3, 4]);
    expect(t[1]!.lessons.map((l) => l.id)).toEqual([21, 22]);
  });
  it("isLessonUnlocked finds a lesson anywhere in the tree", () => {
    const t = computeTree(sections, [done(11)]);
    expect(isLessonUnlocked(t, 12)).toBe(true);
    expect(isLessonUnlocked(t, 21)).toBe(false);
    expect(isLessonUnlocked(t, 999)).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement**

```ts
// app/shared/unlock.ts  (pure, shared)
export interface LessonNode {
  id: number;
  title: string;
  sortOrder: number;
  passingScore: number | null;
}
export interface SectionNode {
  id: number;
  title: string;
  sortOrder: number;
  lessons: LessonNode[];
}
export interface ProgressRow {
  lessonId: number;
  bestScore: number;
  completedAt: Date | null;
}
export interface LessonState extends LessonNode {
  unlocked: boolean;
  completed: boolean;
  bestScore: number | null;
}
export interface SectionState extends Omit<SectionNode, "lessons"> {
  unlocked: boolean;
  completed: boolean;
  lessons: LessonState[];
}

const bySort = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;

/**
 * Rules (spec §6):
 * - Lesson 1 of Section 1 is always unlocked.
 * - A lesson is unlocked when the previous lesson in its section (by order) is completed.
 * - A section is unlocked when the previous section (by order) is completed, i.e. all its lessons are.
 * - An empty section counts as completed.
 */
export function computeTree(sections: SectionNode[], progress: ProgressRow[]): SectionState[] {
  const byLesson = new Map(progress.map((p) => [p.lessonId, p]));
  const ordered = [...sections].sort(bySort);
  let previousSectionCompleted = true; // so the first section is unlocked

  return ordered.map((section) => {
    const sectionUnlocked = previousSectionCompleted;
    let previousLessonCompleted = true; // so the first lesson of an unlocked section is unlocked
    const lessons: LessonState[] = [...section.lessons].sort(bySort).map((lesson) => {
      const p = byLesson.get(lesson.id);
      const completed = p?.completedAt != null;
      const unlocked = sectionUnlocked && previousLessonCompleted;
      previousLessonCompleted = completed;
      return { ...lesson, unlocked, completed, bestScore: p?.bestScore ?? null };
    });
    const completed = lessons.every((l) => l.completed);
    previousSectionCompleted = completed;
    return {
      id: section.id,
      title: section.title,
      sortOrder: section.sortOrder,
      unlocked: sectionUnlocked,
      completed,
      lessons,
    };
  });
}

export function isLessonUnlocked(tree: SectionState[], lessonId: number): boolean {
  for (const s of tree) for (const l of s.lessons) if (l.id === lessonId) return l.unlocked;
  return false;
}
```

```ts
// app/server/progress/unlock.server.ts
import { prisma } from "~/server/database.server";
import { computeTree, type SectionState } from "./unlock";

export async function getSubjectTree(userId: number, subjectId: number): Promise<SectionState[]> {
  const [sections, progress] = await Promise.all([
    prisma.section.findMany({
      where: { subjectId },
      select: {
        id: true,
        title: true,
        sortOrder: true,
        lessons: { select: { id: true, title: true, sortOrder: true, passingScore: true } },
      },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, lesson: { section: { subjectId } } },
      select: { lessonId: true, bestScore: true, completedAt: true },
    }),
  ]);
  return computeTree(sections, progress);
}
```

- [ ] **Step 4: Run, expect pass**

### Task 6.2: recordAttempt

**Files:**

- Create: `app/server/progress/attempts.server.ts`, `tests/progress/attempts.test.ts`, `tests/helpers/content.ts`

**Interfaces:**

- Produces: `recordAttempt(p: { userId: number; lessonId: number; score: number }): Promise<{ passed: boolean; bestScore: number; completedAt: Date | null }>`; `effectivePassingScore(lesson: { passingScore: number | null }): number`.

- [ ] **Step 1: Test helper to build a tiny subject**

```ts
// tests/helpers/content.ts
import { prisma } from "~/server/database.server";

export async function makeSubjectWithLessons(
  lessonsPerSection: number[],
  passingScore: number | null = null,
) {
  const subject = await prisma.subject.create({
    data: {
      slug: "t-" + Math.random().toString(36).slice(2, 8),
      name: "T",
      locale: "en",
      direction: "ltr",
    },
  });
  const lessonIds: number[][] = [];
  for (let s = 0; s < lessonsPerSection.length; s++) {
    const section = await prisma.section.create({
      data: { subjectId: subject.id, title: `S${s + 1}`, sortOrder: s + 1 },
    });
    const ids: number[] = [];
    for (let l = 0; l < lessonsPerSection[s]!; l++) {
      const lesson = await prisma.lesson.create({
        data: {
          sectionId: section.id,
          title: `L${l + 1}`,
          sortOrder: l + 1,
          passingScore,
          content: [],
        },
      });
      ids.push(lesson.id);
    }
    lessonIds.push(ids);
  }
  return { subject, lessonIds };
}
```

- [ ] **Step 2: Failing tests**

```ts
// tests/progress/attempts.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { env } from "~/server/env.server";
import { recordAttempt, effectivePassingScore } from "~/server/progress/attempts.server";
import { getSubjectTree } from "~/server/progress/unlock.server";
import { registerUser } from "~/server/auth/register.server";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";
import { makeSubjectWithLessons } from "../helpers/content";

describe("recordAttempt", () => {
  let userId: number;
  beforeEach(async () => {
    await resetDb();
    const r = await registerUser({ username: "alice", password: "password1" });
    if (!r.ok) throw new Error();
    userId = r.userId;
  });

  it("uses lesson passingScore when set, else the env default", () => {
    expect(effectivePassingScore({ passingScore: 80 })).toBe(80);
    expect(effectivePassingScore({ passingScore: null })).toBe(env.DEFAULT_LESSON_PASSING_SCORE);
  });

  it("writes one attempt per try and keeps the best score", async () => {
    const { lessonIds } = await makeSubjectWithLessons([2]);
    const lessonId = lessonIds[0]![0]!;
    const r1 = await recordAttempt({ userId, lessonId, score: 40 });
    expect(r1).toMatchObject({ passed: false, bestScore: 40, completedAt: null });
    const r2 = await recordAttempt({ userId, lessonId, score: 90 });
    expect(r2.passed).toBe(true);
    expect(r2.bestScore).toBe(90);
    expect(r2.completedAt).not.toBeNull();
    const r3 = await recordAttempt({ userId, lessonId, score: 10 });
    expect(r3.bestScore).toBe(90);
    expect(r3.completedAt?.getTime()).toBe(r2.completedAt?.getTime());
    expect(await prisma.lessonAttempt.count({ where: { userId, lessonId } })).toBe(3);
    expect(await prisma.lessonProgress.count({ where: { userId, lessonId } })).toBe(1);
  });

  it("passing unlocks the next lesson and never re-locks on a later failure", async () => {
    const { subject, lessonIds } = await makeSubjectWithLessons([2]);
    await recordAttempt({ userId, lessonId: lessonIds[0]![0]!, score: 100 });
    let tree = await getSubjectTree(userId, subject.id);
    expect(tree[0]!.lessons[1]!.unlocked).toBe(true);
    await recordAttempt({ userId, lessonId: lessonIds[0]![0]!, score: 0 });
    tree = await getSubjectTree(userId, subject.id);
    expect(tree[0]!.lessons[1]!.unlocked).toBe(true);
  });

  it("respects a per-lesson passing score", async () => {
    const { lessonIds } = await makeSubjectWithLessons([1], 90);
    expect((await recordAttempt({ userId, lessonId: lessonIds[0]![0]!, score: 85 })).passed).toBe(
      false,
    );
    expect((await recordAttempt({ userId, lessonId: lessonIds[0]![0]!, score: 90 })).passed).toBe(
      true,
    );
  });

  it("rejects out-of-range scores", async () => {
    const { lessonIds } = await makeSubjectWithLessons([1]);
    await expect(
      recordAttempt({ userId, lessonId: lessonIds[0]![0]!, score: 101 }),
    ).rejects.toThrow();
    await expect(
      recordAttempt({ userId, lessonId: lessonIds[0]![0]!, score: -1 }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run, expect failure**

- [ ] **Step 4: Implement**

```ts
// app/server/progress/attempts.server.ts
import { env } from "~/server/env.server";
import { prisma } from "~/server/database.server";

export function effectivePassingScore(lesson: { passingScore: number | null }): number {
  return lesson.passingScore ?? env.DEFAULT_LESSON_PASSING_SCORE;
}

/**
 * Record one try. Attempts are append-only (streaks later read createdAt).
 * Progress keeps the best score and the first completion time; nothing ever re-locks.
 */
export async function recordAttempt(p: { userId: number; lessonId: number; score: number }) {
  if (!Number.isInteger(p.score) || p.score < 0 || p.score > 100)
    throw new Error("score must be an integer 0-100");
  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: p.lessonId },
    select: { passingScore: true },
  });
  const passed = p.score >= effectivePassingScore(lesson);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.lessonAttempt.create({
      data: { userId: p.userId, lessonId: p.lessonId, score: p.score, passed, createdAt: now },
    });
    const existing = await tx.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: p.userId, lessonId: p.lessonId } },
    });
    const bestScore = Math.max(existing?.bestScore ?? 0, p.score);
    const completedAt = existing?.completedAt ?? (passed ? now : null);
    await tx.lessonProgress.upsert({
      where: { userId_lessonId: { userId: p.userId, lessonId: p.lessonId } },
      create: { userId: p.userId, lessonId: p.lessonId, bestScore, completedAt },
      update: { bestScore, completedAt },
    });
    return { passed, bestScore, completedAt };
  });
}
```

- [ ] **Step 5: Run, expect pass**

### Task 6.3: Storage provider and asset route

**Files:**

- Create: `app/server/storage/storage.ts`, `app/server/storage/local-disk.server.ts`, `app/server/storage/index.server.ts`, `app/server/storage/assets.server.ts`, `app/routes/assets.$.tsx`, `tests/storage/local-disk.test.ts`
- Modify: `app/routes.ts`

**Interfaces:**

- Produces:

  ```ts
  interface StorageProvider {
    put(key: string, data: Uint8Array, meta: { mimeType: string }): Promise<void>;
    get(key: string): Promise<{ body: ReadableStream<Uint8Array>; mimeType: string; byteSize: number } | null>;
    delete(key: string): Promise<void>;
    publicUrl(key: string): string;
  }
  getStorage(): StorageProvider
  createAssetFromBuffer(p: { data: Uint8Array; mimeType: string; uploadedById?: number; width?: number; height?: number; key?: string }): Promise<Asset>
  assetUrlMap(assetIds: number[]): Promise<Record<number, string>>
  ```

- [ ] **Step 1: Failing test**

```ts
// tests/storage/local-disk.test.ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { LocalDiskStorage } from "~/server/storage/local-disk.server";

const dir = mkdtempSync(join(tmpdir(), "storage-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("LocalDiskStorage", () => {
  const s = new LocalDiskStorage(dir);
  it("puts, gets, deletes, and builds URLs", async () => {
    await s.put("a/b.png", new TextEncoder().encode("hello"), { mimeType: "image/png" });
    const got = await s.get("a/b.png");
    expect(got?.mimeType).toBe("image/png");
    expect(got?.byteSize).toBe(5);
    expect(await new Response(got!.body).text()).toBe("hello");
    expect(s.publicUrl("a/b.png")).toBe("/assets/a/b.png");
    await s.delete("a/b.png");
    expect(await s.get("a/b.png")).toBeNull();
  });
  it("refuses path traversal", async () => {
    await expect(s.put("../evil", new Uint8Array(), { mimeType: "text/plain" })).rejects.toThrow();
    expect(await s.get("../../etc/passwd")).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement**

```ts
// app/server/storage/storage.ts  (shared types)
export interface StoredObject {
  body: ReadableStream<Uint8Array>;
  mimeType: string;
  byteSize: number;
}
export interface StorageProvider {
  put(key: string, data: Uint8Array, meta: { mimeType: string }): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}
```

```ts
// app/server/storage/local-disk.server.ts
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import type { StorageProvider, StoredObject } from "./storage";

/** Stores files under root/<key> and a sidecar <key>.meta.json with the MIME type. */
export class LocalDiskStorage implements StorageProvider {
  private readonly root: string;
  constructor(root: string) {
    this.root = resolve(root);
  }

  private pathFor(key: string): string | null {
    const full = resolve(this.root, key);
    return full === this.root || !full.startsWith(this.root + sep) ? null : full;
  }

  async put(key: string, data: Uint8Array, meta: { mimeType: string }) {
    const path = this.pathFor(key);
    if (!path) throw new Error("Invalid storage key");
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    await writeFile(path + ".meta.json", JSON.stringify({ mimeType: meta.mimeType }));
  }

  async get(key: string): Promise<StoredObject | null> {
    const path = this.pathFor(key);
    if (!path) return null;
    try {
      const [info, metaRaw] = await Promise.all([
        stat(path),
        readFile(path + ".meta.json", "utf8"),
      ]);
      const meta = JSON.parse(metaRaw) as { mimeType: string };
      const body = Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>;
      return { body, mimeType: meta.mimeType, byteSize: info.size };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    const path = this.pathFor(key);
    if (!path) return;
    await rm(path, { force: true });
    await rm(path + ".meta.json", { force: true });
  }

  publicUrl(key: string) {
    return "/assets/" + key.split(sep).join("/");
  }
}
```

```ts
// app/server/storage/index.server.ts
import { env } from "~/server/env.server";
import { LocalDiskStorage } from "./local-disk.server";
import type { StorageProvider } from "./storage";

let instance: StorageProvider | undefined;
export function getStorage(): StorageProvider {
  if (instance) return instance;
  switch (env.STORAGE_PROVIDER) {
    case "local":
      instance = new LocalDiskStorage(env.STORAGE_LOCAL_DIR);
      return instance;
    // TODO(cloud-storage): add e.g. "s3" here with a new provider file.
  }
}
```

```ts
// app/server/storage/assets.server.ts
import { randomUUID } from "node:crypto";
import { prisma } from "~/server/database.server";
import { getStorage } from "./index.server";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export async function createAssetFromBuffer(p: {
  data: Uint8Array;
  mimeType: string;
  uploadedById?: number;
  width?: number;
  height?: number;
  key?: string;
}) {
  const ext = EXT[p.mimeType] ?? "bin";
  // `key` lets the seed use a stable, idempotent location; uploads get a random one.
  const key = p.key ?? `${new Date().getFullYear()}/${randomUUID()}.${ext}`;
  await getStorage().put(key, p.data, { mimeType: p.mimeType });
  return prisma.asset.create({
    data: {
      storageKey: key,
      mimeType: p.mimeType,
      byteSize: p.data.byteLength,
      uploadedById: p.uploadedById ?? null,
      width: p.width ?? null,
      height: p.height ?? null,
    },
  });
}

export async function assetUrlMap(assetIds: number[]): Promise<Record<number, string>> {
  if (assetIds.length === 0) return {};
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, storageKey: true },
  });
  const storage = getStorage();
  return Object.fromEntries(assets.map((a) => [a.id, storage.publicUrl(a.storageKey)]));
}
```

```ts
// app/routes/assets.$.tsx
import type { Route } from "./+types/assets.$";
import { getStorage } from "~/server/storage/index.server";

export async function loader({ params }: Route.LoaderArgs) {
  const key = params["*"];
  if (!key) throw new Response("Not found", { status: 404 });
  const obj = await getStorage().get(key);
  if (!obj) throw new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.mimeType,
      "Content-Length": String(obj.byteSize),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
```

Add `route("assets/*", "routes/assets.$.tsx")` to `app/routes.ts`.

- [ ] **Step 4: Run, expect pass** — `npx vitest run tests/storage`

### Stage 6 checkpoint (stop here)

User can verify:

- `npm test` passes (unlock, attempts, local-disk)
- In Prisma Studio, after running the attempts test, see `LessonAttempt` rows per try and one `LessonProgress` row
- `curl -i http://localhost:5173/assets/nope` returns 404 (served by the asset route, which is public)

---

## Stage 7: Seed, subject pages, docs

### Task 7.1: Seed data modules and seed script

**Files:**

- Create: `prisma/seed-data/types.ts`, `prisma/seed-data/placeholder.png`, `prisma/seed-data/genesis.ts`, `prisma/seed-data/sample-ltr.ts`, `prisma/seed-lib.ts` (importable `seedAll`), `prisma/seed.ts` (CLI entry), `tests/seed/seed.test.ts`

**Interfaces:**

- Produces: `SeedSubject = { slug, name, description, locale, direction, sortOrder, sections: { title, sortOrder, lessons: { title, sortOrder, passingScore?, content: (assetId: number) => LessonContent }[] }[] }`; `seedAll(): Promise<void>`.

- [ ] **Step 1: Types and placeholder image**

```ts
// prisma/seed-data/types.ts
import type { LessonContent } from "../../app/schemas/content-blocks";

export interface SeedLesson {
  title: string;
  sortOrder: number;
  passingScore?: number;
  content: (assetId: number) => LessonContent;
}
export interface SeedSection {
  title: string;
  sortOrder: number;
  lessons: SeedLesson[];
}
export interface SeedSubject {
  slug: string;
  name: string;
  description: string;
  locale: string;
  direction: "rtl" | "ltr";
  sortOrder: number;
  sections: SeedSection[];
}
```

Create `placeholder.png` as a 64×64 solid PNG (generate with a tiny script, e.g. `node -e` writing a minimal valid PNG, or copy any small PNG; commit the binary).

- [ ] **Step 2: Genesis seed data** (the only place Bible content lives)

```ts
// prisma/seed-data/genesis.ts
import type { LessonContent } from "../../app/schemas/content-blocks";
import type { SeedSubject } from "./types";

const chapterLesson = (title: string, sortOrder: number) => ({
  title,
  sortOrder,
  content: (assetId: number): LessonContent => [
    { id: `${sortOrder}-h`, type: "heading", level: 1, text: title },
    {
      id: `${sortOrder}-p`,
      type: "paragraph",
      content: [
        { text: "זהו תוכן ", marks: [] },
        { text: "זמני", marks: ["bold"] },
        { text: " לשיעור. הפסקה כוללת ", marks: [] },
        { text: "הדגשה", marks: ["highlight"] },
        { text: " וגם ", marks: [] },
        { text: "נטוי", marks: ["italic"] },
        { text: ".", marks: [] },
      ],
    },
    {
      id: `${sortOrder}-q`,
      type: "quote",
      sourceLabel: "פסוק",
      reference: `${title}, א`,
      text: "טקסט ציטוט זמני להדגמה של בלוק ציטוט עם הדגשה.",
      highlights: [{ start: 0, end: 10 }],
    },
    {
      id: `${sortOrder}-i`,
      type: "image",
      assetId,
      alt: "תמונת מקום לשיעור",
      caption: "כיתוב לדוגמה",
    },
    {
      id: `${sortOrder}-l`,
      type: "list",
      ordered: true,
      items: [[{ text: "נקודה ראשונה", marks: [] }], [{ text: "נקודה שנייה", marks: ["bold"] }]],
    },
  ],
});

export const genesis: SeedSubject = {
  slug: "genesis",
  name: 'תנ"ך – בראשית',
  description: "פרקי ספר בראשית לבחינה.",
  locale: "he",
  direction: "rtl",
  sortOrder: 1,
  sections: [
    {
      title: "אברהם: הבטחה ומסע",
      sortOrder: 1,
      lessons: chapters("פרק יב", "פרק יג", "פרק טו", "פרק טז"),
    },
    {
      title: "אברהם: ברית ונסיון",
      sortOrder: 2,
      lessons: chapters("פרק יח", "פרק כא", "פרק כב", "פרק כג"),
    },
    { title: "יצחק ויעקב", sortOrder: 3, lessons: chapters("פרק כד", "פרק כה", "פרק כז") },
    { title: "יעקב בחרן", sortOrder: 4, lessons: chapters("פרק כח", "פרק כט") },
  ],
};

/** sortOrder is 1-based. */
function chapters(...titles: string[]) {
  return titles.map((title, i) => chapterLesson(title, i + 1));
}
```

- [ ] **Step 3: Sample LTR subject**

```ts
// prisma/seed-data/sample-ltr.ts
import type { LessonContent } from "../../app/schemas/content-blocks";
import type { SeedSubject } from "./types";

const lesson = (title: string, sortOrder: number, passingScore?: number) => ({
  title,
  sortOrder,
  passingScore,
  content: (assetId: number): LessonContent => [
    { id: `${sortOrder}-h`, type: "heading", level: 1, text: title },
    {
      id: `${sortOrder}-p`,
      type: "paragraph",
      content: [
        { text: "Placeholder paragraph with ", marks: [] },
        { text: "bold", marks: ["bold"] },
        { text: " and ", marks: [] },
        { text: "highlight", marks: ["highlight"] },
        { text: ".", marks: [] },
      ],
    },
    {
      id: `${sortOrder}-q`,
      type: "quote",
      sourceLabel: "Primary source",
      reference: "Sample Act, s.1",
      text: "No free man shall be seized or imprisoned.",
      highlights: [{ start: 3, end: 11 }],
    },
    {
      id: `${sortOrder}-rtl`,
      type: "paragraph",
      dir: "rtl",
      content: [{ text: "פסקה זו מדגימה כיווניות שונה בתוך מקצוע באנגלית.", marks: [] }],
    },
    {
      id: `${sortOrder}-i`,
      type: "image",
      assetId,
      alt: "Placeholder image",
      caption: "Sample caption",
    },
    {
      id: `${sortOrder}-l`,
      type: "list",
      ordered: false,
      items: [[{ text: "First item", marks: [] }], [{ text: "Second item", marks: ["italic"] }]],
    },
  ],
});

export const sampleLtr: SeedSubject = {
  slug: "sample-ltr",
  name: "Sample Subject (LTR demo)",
  description: "Demo subject proving the platform is subject-agnostic. Remove or replace later.",
  locale: "en",
  direction: "ltr",
  sortOrder: 99,
  sections: [
    {
      title: "Basics",
      sortOrder: 1,
      lessons: [lesson("Intro", 1), lesson("Terms", 2, 70), lesson("Review", 3)],
    },
    {
      title: "Advanced",
      sortOrder: 2,
      lessons: [lesson("Deep dive", 1), lesson("Synthesis", 2, 80)],
    },
  ],
};
```

- [ ] **Step 4: Failing seed test**

```ts
// tests/seed/seed.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { seedAll } from "../../prisma/seed-lib";
import { prisma } from "~/server/database.server";
import { parseLessonContent } from "~/server/lesson-content.server";
import { resetDb } from "../helpers/db";

describe("seed", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.SEED_ADMIN_USERNAME = "admin";
    process.env.SEED_ADMIN_PASSWORD = "adminadmin";
  });

  it("creates the admin, two subjects with the expected shape, and valid content; runs twice idempotently", async () => {
    await seedAll();
    await seedAll();
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "admin" } });
    expect(admin.role).toBe("SYSTEM_ADMIN");
    expect(await prisma.subject.count()).toBe(2);

    const g = await prisma.subject.findUniqueOrThrow({
      where: { slug: "genesis" },
      include: { sections: { include: { lessons: true }, orderBy: { sortOrder: "asc" } } },
    });
    expect(g.direction).toBe("rtl");
    expect(g.sections.map((s) => s.lessons.length)).toEqual([4, 4, 3, 2]);

    const s = await prisma.subject.findUniqueOrThrow({
      where: { slug: "sample-ltr" },
      include: { sections: { include: { lessons: true }, orderBy: { sortOrder: "asc" } } },
    });
    expect(s.direction).toBe("ltr");
    expect(s.sections.map((x) => x.lessons.length)).toEqual([3, 2]);

    const lessons = await prisma.lesson.findMany();
    const types = new Set<string>();
    for (const l of lessons) for (const b of parseLessonContent(l.content)) types.add(b.type);
    expect([...types].sort()).toEqual(["heading", "image", "list", "paragraph", "quote"]);
    expect(await prisma.question.count()).toBe(0);
    expect(await prisma.asset.count()).toBe(1);
  });
});
```

- [ ] **Step 5: Run, expect failure**

- [ ] **Step 6: Implement seed**

```ts
// prisma/seed-lib.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "../app/server/database.server";
import { hashPassword } from "../app/server/auth/password.server";
import { serializeLessonContent } from "../app/server/lesson-content.server";
import { createAssetFromBuffer } from "../app/server/storage/assets.server";
import { genesis } from "./seed-data/genesis";
import { sampleLtr } from "./seed-data/sample-ltr";
import type { SeedSubject } from "./seed-data/types";

const PLACEHOLDER_KEY = "seed-placeholder/placeholder.png";

async function seedAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!username || !password)
    throw new Error("SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD are required");
  const email = process.env.SEED_ADMIN_EMAIL || null;
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { username },
    create: { username, email, passwordHash, role: "SYSTEM_ADMIN" },
    update: { role: "SYSTEM_ADMIN", email },
  });
}

async function seedPlaceholderAsset(): Promise<number> {
  const existing = await prisma.asset.findUnique({ where: { storageKey: PLACEHOLDER_KEY } });
  if (existing) return existing.id;
  const data = await readFile(join(import.meta.dirname, "seed-data", "placeholder.png"));
  const asset = await createAssetFromBuffer({
    data,
    mimeType: "image/png",
    width: 64,
    height: 64,
    key: PLACEHOLDER_KEY,
  });
  return asset.id;
}

async function seedSubject(def: SeedSubject, assetId: number) {
  const subject = await prisma.subject.upsert({
    where: { slug: def.slug },
    create: {
      slug: def.slug,
      name: def.name,
      description: def.description,
      locale: def.locale,
      direction: def.direction,
      sortOrder: def.sortOrder,
    },
    update: {
      name: def.name,
      description: def.description,
      locale: def.locale,
      direction: def.direction,
      sortOrder: def.sortOrder,
    },
  });
  for (const s of def.sections) {
    const section = await prisma.section.upsert({
      where: { subjectId_sortOrder: { subjectId: subject.id, sortOrder: s.sortOrder } },
      create: { subjectId: subject.id, title: s.title, sortOrder: s.sortOrder },
      update: { title: s.title },
    });
    for (const l of s.lessons) {
      const content = serializeLessonContent(l.content(assetId));
      await prisma.lesson.upsert({
        where: { sectionId_sortOrder: { sectionId: section.id, sortOrder: l.sortOrder } },
        create: {
          sectionId: section.id,
          title: l.title,
          sortOrder: l.sortOrder,
          passingScore: l.passingScore ?? null,
          content,
        },
        update: { title: l.title, passingScore: l.passingScore ?? null, content },
      });
    }
  }
}

export async function seedAll() {
  await seedAdmin();
  const assetId = await seedPlaceholderAsset();
  for (const def of [genesis, sampleLtr]) await seedSubject(def, assetId);
}
```

```ts
// prisma/seed.ts  (CLI entry used by `prisma db seed`)
import "dotenv/config";
import { prisma } from "../app/server/database.server";
import { seedAll } from "./seed-lib";

try {
  await seedAll();
  console.log("Seed complete.");
} finally {
  await prisma.$disconnect();
}
```

- [ ] **Step 7: Run, expect pass** — `npx vitest run tests/seed`, then `npm run db:seed` against the dev DB.

### Task 7.2: Subject picker, subject tree, lesson page

**Files:**

- Create: `app/server/content/subjects.server.ts`, `app/server/content/lessons.server.ts`, `app/routes/app/subjects.$slug.tsx`, `app/routes/app/subjects.$slug.lessons.$lessonId.tsx`, `tests/content/lesson-loader.test.ts`
- Modify: `app/routes/app/subjects.tsx`, `app/routes.ts`

**Interfaces:**

- Produces: `listActiveSubjectsForUser(userId)` → `{ id, slug, name, description, enrolled }[]`; `enrollUser(userId, subjectId)`; `getSubjectBySlugForUser(userId, slug)` → subject or null (null if not enrolled); `getLessonForUser(userId, slug, lessonId)` → `{ lesson, subject, tree }` or throws 403/404 `data()`.

- [ ] **Step 1: Failing loader-level test** (pins Review Focus 2 at the server level)

```ts
// tests/content/lesson-loader.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { registerUser } from "~/server/auth/register.server";
import { enrollUser } from "~/server/content/subjects.server";
import { getLessonForUser } from "~/server/content/lessons.server";
import { recordAttempt } from "~/server/progress/attempts.server";
import { prisma } from "~/server/database.server";
import { resetDb } from "../helpers/db";
import { makeSubjectWithLessons } from "../helpers/content";

describe("getLessonForUser", () => {
  let userId: number;
  beforeEach(async () => {
    await resetDb();
    const r = await registerUser({ username: "alice", password: "password1" });
    if (!r.ok) throw new Error();
    userId = r.userId;
  });

  it("404s when not enrolled, 403s when locked, returns parsed content when unlocked", async () => {
    const { subject, lessonIds } = await makeSubjectWithLessons([2]);
    await expect(getLessonForUser(userId, subject.slug, lessonIds[0]![0]!)).rejects.toMatchObject({
      status: 404,
    });
    await enrollUser(userId, subject.id);
    await expect(getLessonForUser(userId, subject.slug, lessonIds[0]![1]!)).rejects.toMatchObject({
      status: 403,
    });
    const r = await getLessonForUser(userId, subject.slug, lessonIds[0]![0]!);
    expect(r.blocks).toEqual([]);
    await recordAttempt({ userId, lessonId: lessonIds[0]![0]!, score: 100 });
    expect((await getLessonForUser(userId, subject.slug, lessonIds[0]![1]!)).lesson.id).toBe(
      lessonIds[0]![1],
    );
  });

  it("surfaces invalid stored content as a 500 with a clear message, not a crash", async () => {
    const { subject, lessonIds } = await makeSubjectWithLessons([1]);
    await enrollUser(userId, subject.id);
    await prisma.lesson.update({
      where: { id: lessonIds[0]![0]! },
      data: { content: [{ id: "x", type: "video" }] },
    });
    await expect(getLessonForUser(userId, subject.slug, lessonIds[0]![0]!)).rejects.toMatchObject({
      status: 500,
    });
  });
});
```

- [ ] **Step 2: Run, expect failure**

- [ ] **Step 3: Implement server modules**

```ts
// app/server/content/subjects.server.ts
import { prisma } from "~/server/database.server";

export async function listActiveSubjectsForUser(userId: number) {
  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      direction: true,
      users: { where: { id: userId }, select: { id: true } },
    },
  });
  return subjects.map(({ users, ...s }) => ({ ...s, enrolled: users.length > 0 }));
}

export async function enrollUser(userId: number, subjectId: number) {
  await prisma.user.update({
    where: { id: userId },
    data: { subjects: { connect: { id: subjectId } } },
  });
}

/** Returns the subject only if active and the user is enrolled. */
export function getSubjectBySlugForUser(userId: number, slug: string) {
  return prisma.subject.findFirst({
    where: { slug, isActive: true, users: { some: { id: userId } } },
  });
}
```

```ts
// app/server/content/lessons.server.ts
import { data } from "react-router";
import { t } from "~/i18n";
import { prisma } from "~/server/database.server";
import { LessonContentError, parseLessonContent } from "./lesson-content.server";
import { getSubjectBySlugForUser } from "./subjects.server";
import { getSubjectTree } from "~/server/progress/unlock.server";
import { isLessonUnlocked } from "~/shared/unlock";
import { assetUrlMap } from "~/server/storage/assets.server";

export async function getLessonForUser(userId: number, slug: string, lessonId: number) {
  const subject = await getSubjectBySlugForUser(userId, slug);
  if (!subject) throw data(t("error.notFound"), { status: 404 });

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, section: { subjectId: subject.id } },
    include: { section: true },
  });
  if (!lesson) throw data(t("error.notFound"), { status: 404 });

  const tree = await getSubjectTree(userId, subject.id);
  if (!isLessonUnlocked(tree, lesson.id)) throw data(t("error.lessonLocked"), { status: 403 });

  let blocks;
  try {
    blocks = parseLessonContent(lesson.content);
  } catch (e) {
    if (e instanceof LessonContentError) {
      console.error(`Invalid content in lesson ${lesson.id}`, e.issues);
      throw data(t("error.generic"), { status: 500 });
    }
    throw e;
  }
  const assetIds = blocks.flatMap((b) => (b.type === "image" ? [b.assetId] : []));
  const assetUrls = await assetUrlMap(assetIds);
  return { subject, lesson, blocks, assetUrls, tree };
}
```

- [ ] **Step 4: Routes**

```ts
// app/routes.ts  (replace the app layout children)
layout("routes/app/layout.tsx", [
  route("subjects", "routes/app/subjects.tsx"),
  route("subjects/:slug", "routes/app/subjects.$slug.tsx"),
  route("subjects/:slug/lessons/:lessonId", "routes/app/subjects.$slug.lessons.$lessonId.tsx"),
]),
```

```tsx
// app/routes/app/subjects.tsx
import { Form, Link } from "react-router";
import type { Route } from "./+types/subjects";
import { t } from "~/i18n";
import { requireUser } from "~/server/auth/context.server";
import { enrollUser, listActiveSubjectsForUser } from "~/server/content/subjects.server";

export async function loader({ context }: Route.LoaderArgs) {
  const user = requireUser(context);
  return { subjects: await listActiveSubjectsForUser(user.id) };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = requireUser(context);
  const form = await request.formData();
  const subjectId = Number(form.get("subjectId"));
  if (Number.isInteger(subjectId)) await enrollUser(user.id, subjectId);
  return null;
}

export default function Subjects({ loaderData }: Route.ComponentProps) {
  return (
    <main className="container">
      <h1>{t("subjects.title")}</h1>
      <ul>
        {loaderData.subjects.map((s) => (
          <li key={s.id}>
            <h2 dir={s.direction}>{s.name}</h2>
            {s.description ? <p dir={s.direction}>{s.description}</p> : null}
            {s.enrolled ? (
              <Link to={`/subjects/${s.slug}`}>{t("subjects.open")}</Link>
            ) : (
              <Form method="post">
                <input type="hidden" name="subjectId" value={s.id} />
                <button type="submit">{t("subjects.enroll")}</button>
              </Form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

```tsx
// app/routes/app/subjects.$slug.tsx
import { Link, data } from "react-router";
import type { Route } from "./+types/subjects.$slug";
import { t } from "~/i18n";
import { requireUser } from "~/server/auth/context.server";
import { getSubjectBySlugForUser } from "~/server/content/subjects.server";
import { getSubjectTree } from "~/server/progress/unlock.server";

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = requireUser(context);
  const subject = await getSubjectBySlugForUser(user.id, params.slug);
  if (!subject) throw data(t("error.notFound"), { status: 404 });
  const tree = await getSubjectTree(user.id, subject.id);
  return {
    subject: { slug: subject.slug, name: subject.name, direction: subject.direction },
    tree,
  };
}

export default function SubjectPage({ loaderData }: Route.ComponentProps) {
  const { subject, tree } = loaderData;
  return (
    <main className="container">
      <h1 dir={subject.direction}>{subject.name}</h1>
      {tree.map((section) => (
        <section key={section.id} className={section.unlocked ? "" : "locked"}>
          <h2 dir={subject.direction}>
            {section.title} {section.unlocked ? "" : `(${t("subject.locked")})`}
          </h2>
          <ol>
            {section.lessons.map((lesson) => (
              <li key={lesson.id}>
                {lesson.unlocked ? (
                  <Link
                    to={`/subjects/${subject.slug}/lessons/${lesson.id}`}
                    dir={subject.direction}
                  >
                    {lesson.title}
                  </Link>
                ) : (
                  <span dir={subject.direction}>{lesson.title}</span>
                )}
                {lesson.completed ? ` · ${t("subject.completed")}` : ""}
                {lesson.bestScore != null
                  ? ` · ${t("subject.bestScore")}: ${lesson.bestScore}`
                  : ""}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
```

```tsx
// app/routes/app/subjects.$slug.lessons.$lessonId.tsx
import { Link } from "react-router";
import type { Route } from "./+types/subjects.$slug.lessons.$lessonId";
import { t } from "~/i18n";
import { requireUser } from "~/server/auth/context.server";
import { getLessonForUser } from "~/server/content/lessons.server";
import { LessonContent } from "~/components/lesson-content/LessonContent";
import { QuestionsPlaceholder } from "~/components/QuestionsPlaceholder";

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = requireUser(context);
  const lessonId = Number(params.lessonId);
  const { subject, lesson, blocks, assetUrls } = await getLessonForUser(
    user.id,
    params.slug,
    lessonId,
  );
  return {
    subject: { slug: subject.slug, direction: subject.direction },
    lesson: { id: lesson.id, title: lesson.title },
    blocks,
    assetUrls,
  };
}

// TODO(quiz): add an `action` here that validates answers and calls recordAttempt().
export default function LessonPage({ loaderData }: Route.ComponentProps) {
  const { subject, lesson, blocks, assetUrls } = loaderData;
  return (
    <main className="container">
      <p>
        <Link to={`/subjects/${subject.slug}`}>{t("lesson.back")}</Link>
      </p>
      <h1 dir={subject.direction}>{lesson.title}</h1>
      <LessonContent blocks={blocks} direction={subject.direction} assetUrls={assetUrls} />
      <QuestionsPlaceholder />
    </main>
  );
}
```

- [ ] **Step 5: Run tests, typecheck, lint** — all green, and `npm run lint` leakage check still passes (no subject words in `app/`).

- [ ] **Step 6: Manual walkthrough**

`npm run db:reset` (runs migrations + seed), `npm run dev`, log in as the seed admin, enroll in both subjects, open the RTL subject: first lesson of section 1 open, rest locked; open a lesson and see all five block types rendered; open the LTR subject and confirm `dir="ltr"` on the content and `dir="rtl"` on the override paragraph.

### Task 7.3: README and CLAUDE.md

**Files:**

- Modify: `README.md`, `CLAUDE.md`

- [ ] **Step 1: README contents** (write fully)

Sections: What this is; Prerequisites (Node 24, Docker); Setup (`cp .env.example .env`, `npm install`, `npm run db:up`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`); Scripts table; Environment variables table (copy from `.env.example` with one-line meanings); Security notes: brute-force protection summary, "This is brute-force protection, not DDoS mitigation. Rate limiting against floods belongs at the network or reverse-proxy layer (nginx, Cloudflare, etc.)", reverse proxy and `TRUSTED_PROXY_COUNT`, cleanup cron example (`0 3 * * * cd /app && npm run cleanup`); Content model overview with a pointer to the spec; Adding a new subject (the seven data-only steps); Adding a block type (the four code steps); Testing (`npm run db:up` then `npm test`).

- [ ] **Step 2: CLAUDE.md** (append below the existing Git rules)

```markdown
## Architecture (foundation)

Spec: `docs/superpowers/specs/2026-10-01-study-platform-foundation-design.md`. Plan: `docs/superpowers/plans/2026-10-01-study-platform-foundation.md`.

- React Router v8 framework mode (middleware on by default). The single route guard is `app/middleware/auth.server.ts`, registered on `root.tsx`. Public paths are listed in `app/config/public-routes.ts`; everything else requires a session.
- Server-only code lives in `*.server.ts`. Prisma is only imported from `app/lib/database.server.ts` consumers that are themselves `.server.ts`, or from route modules (loaders/actions/middleware are stripped from the client bundle). ESLint enforces this.
- Shared pure modules (no Node/Prisma imports): `app/lib/content/blocks.ts`, `direction.ts`, `app/lib/auth/roles.ts`, `app/lib/auth/validation.ts`, `app/shared/unlock.ts`, `app/i18n/*`.
- Prisma 7 with `@prisma/adapter-mariadb`; `DATABASE_URL` is read in `prisma.config.ts`, not in the schema. Generated client: `prisma/generated/client`.
- Lesson content is a JSON array of blocks validated by zod on every read and write (`lesson-content.server.ts`). Renderers live in `app/components/lesson-content/blocks/` and are registered in `LessonContent.tsx`; the registry is exhaustive over the union.
- Content direction comes from `Subject.direction` with optional per-block `dir`. The UI shell is Hebrew RTL; strings go through `t()` in `app/i18n`.
- Progression: `computeTree` in `app/shared/unlock.ts` is the single source of unlock rules. `recordAttempt` is the only writer of `LessonAttempt`/`LessonProgress`.
- Brute-force settings are env-backed in `app/config/security.server.ts`; escalation steps are constants there. IpBlock has one row per IP and escalates in place.
- Storage goes through `StorageProvider` (`app/server/storage/`); only `local` exists.

## Conventions

- No subject-specific names, strings, or logic outside `prisma/seed-data/`. `npm run lint` runs `scripts/check-no-subject-leakage.ts`.
- New block type: schema in `blocks.ts` → renderer component → register in `LessonContent.tsx`. No migration.
- New subject: data only (see README "Adding a new subject"). If a subject seems to need code, generalize the model instead.
- Tests live in `tests/` mirroring `app/`; DB tests need `npm run db:up`. TDD: failing test first.
- Future hooks are marked `TODO(<feature>)`: `TODO(quiz)`, `TODO(content-editor)`, `TODO(user-management)`, `TODO(cloud-storage)`, `TODO(streaks)`, `TODO(2fa)`.
```

- [ ] **Step 3: Final verification**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all green; `build/` produced.

### Stage 7 checkpoint (stop here)

User can verify:

- Fresh clone flow from the README works end to end
- Both seeded subjects behave as described in Task 7.2 Step 6
- `npm run lint` passes including the leakage check
- All tests pass; `npm run build` succeeds

---

## Self-review notes

- Spec coverage: §3 → Stage 1; §5 → Stage 2; §9 → Stage 3 + Task 4.3; §10 → Tasks 4.1–4.2; §7 → Stage 5; §6 → Tasks 6.1–6.2; §8 → Task 6.3; §11–12 → Stage 7; §13 → README + CLAUDE.md; §14 → tests in each task. `Material` has schema only (spec says optional attachments, no UI required).
- Known deviation (accepted by the user): `react-router-serve` does not expose the socket IP, so with `TRUSTED_PROXY_COUNT=0` the IP is `"unknown"` and IP blocking is off. The `"unknown"` IP is never blocked; attempts are still logged; username lockout applies. Production with `TRUSTED_PROXY_COUNT=0` logs a startup warning.
- Review Focus items 1–5 are pinned in Tasks 4.1, 7.2/5.2, 6.1, 4.3, 5.1 respectively.
