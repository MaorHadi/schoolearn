import { DAY_MS, MINUTE_MS } from "~/shared/time";
import { env } from "./env.server";

/**
 * Escalating IpBlock durations by strike number (1st, 2nd, 3rd, 4th and later).
 * Kept in code rather than env by design: these are policy, not deployment tuning.
 */
const IP_BLOCK_ESCALATION_MINUTES = [15, 60, 360, 1440] as const;

/** How far back prior blocks count toward escalation, and how long expired rows are retained. */
const IP_BLOCK_ESCALATION_LOOKBACK_DAYS = 7;

/** All brute-force and session thresholds, resolved from env with defaults (see .env.example). */
export const security = {
  failureWindowMs: env.AUTH_FAILURE_WINDOW_MINUTES * MINUTE_MS,
  usernameMaxFailures: env.AUTH_USERNAME_MAX_FAILURES,
  usernameLockoutMs: env.AUTH_USERNAME_LOCKOUT_MINUTES * MINUTE_MS,
  ipMaxFailures: env.AUTH_IP_MAX_FAILURES,
  authLogRetentionMs: env.AUTH_LOG_RETENTION_DAYS * DAY_MS,
  registerMaxPerIp: env.AUTH_REGISTER_MAX_PER_IP,
  registerWindowMs: env.AUTH_REGISTER_WINDOW_MINUTES * MINUTE_MS,
  escalationLookbackMs: IP_BLOCK_ESCALATION_LOOKBACK_DAYS * DAY_MS,
} as const;

/** Block duration for the n-th strike, clamped to the escalation table. */
export function escalationDurationMs(strikeCount: number): number {
  const index = Math.min(Math.max(strikeCount, 1), IP_BLOCK_ESCALATION_MINUTES.length) - 1;
  return (IP_BLOCK_ESCALATION_MINUTES[index] ?? IP_BLOCK_ESCALATION_MINUTES[0]) * MINUTE_MS;
}
