// Tests ALWAYS run against a separate database so they never wipe the seeded dev data.
// Override with TEST_DATABASE_URL if your test database lives elsewhere.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "mysql://study:study@localhost:3307/study_test";
process.env.SESSION_SECRET ??= "test-secret-test-secret";

// Guard tests exercise X-Forwarded-For handling; trust one hop.
process.env.TRUSTED_PROXY_COUNT ??= "1";

import "@testing-library/jest-dom/vitest";
