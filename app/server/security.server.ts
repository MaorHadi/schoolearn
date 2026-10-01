import { env } from "./env.server";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Escalating IpBlock durations by strike number (1st, 2nd, 3rd, 4th and later).
 * Kept in code rather than env by design: these are policy, not deployment tuning.
 */
export const IP_BLOCK_ESCALATION_MINUTES = [15, 60, 360, 1440] as const;

/** How far back prior blocks count toward escalation, and how long expired rows are retained. */
export const IP_BLOCK_ESCALATION_LOOKBACK_DAYS = 7;

/** All brute-force and session thresholds, resolved from env with defaults (see .env.example). */
export const security = {
  failureWindowMs: env.AUTH_FAILURE_WINDOW_MINUTES * MINUTE_MS,
  usernameMaxFailures: env.AUTH_USERNAME_MAX_FAILURES,
  usernameLockoutMs: env.AUTH_USERNAME_LOCKOUT_MINUTES * MINUTE_MS,
  ipMaxFailures: env.AUTH_IP_MAX_FAILURES,
  authLogRetentionMs: env.AUTH_LOG_RETENTION_DAYS * DAY_MS,
  escalationMinutes: IP_BLOCK_ESCALATION_MINUTES,
  escalationLookbackMs: IP_BLOCK_ESCALATION_LOOKBACK_DAYS * DAY_MS,
} as const;

/** Block duration for the n-th strike, clamped to the escalation table. */
export function escalationDurationMs(strikeCount: number): number {
  const index = Math.min(Math.max(strikeCount, 1), IP_BLOCK_ESCALATION_MINUTES.length) - 1;
  return (IP_BLOCK_ESCALATION_MINUTES[index] ?? IP_BLOCK_ESCALATION_MINUTES[0]) * MINUTE_MS;
}
