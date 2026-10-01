// Shared test environment defaults. Real values from .env win when present.
process.env.DATABASE_URL ??= "mysql://study:study@localhost:3307/study";
process.env.SESSION_SECRET ??= "test-secret-test-secret";
