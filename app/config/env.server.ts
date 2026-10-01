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

/** Parse and validate raw environment variables. Empty strings count as unset. */
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
    "[security] TRUSTED_PROXY_COUNT=0 in production: client IPs resolve to 'unknown', so per-IP " +
      "blocking is inactive. Run behind a reverse proxy and set TRUSTED_PROXY_COUNT to the number of trusted hops.",
  );
}
