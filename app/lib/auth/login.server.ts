import { security } from "~/config/security.server";
import { prisma } from "~/lib/database.server";
import { countRecentFailures, recordAuthAttempt } from "./auth-log.server";
import { UNKNOWN_IP } from "./client-ip.server";
import { applyIpBlock, findActiveIpBlock } from "./ip-block.server";
import { DUMMY_HASH, verifyPassword } from "./password.server";
import type { LoginFailureReason, LoginInput } from "./validation";

export type AuthResult = { ok: true; userId: number } | { ok: false; reason: LoginFailureReason };

/** Pure credential check. No logging, no lockout. Use `login()` from routes. */
export async function authenticate(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { username: input.username } });
  if (!user) {
    await verifyPassword(DUMMY_HASH, input.password); // equalize timing with the found-user path
    return { ok: false, reason: "USER_NOT_FOUND" };
  }
  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) return { ok: false, reason: "BAD_PASSWORD" };
  if (user.isDisabled) return { ok: false, reason: "USER_DISABLED" };
  return { ok: true, userId: user.id };
}

/**
 * Full login flow with brute-force protection:
 *  1. active IpBlock → fail
 *  2. username failures in lockout window ≥ N → fail
 *  3. credentials
 *  4. every attempt logged; on failure, IP failures in window ≥ M → upsert IpBlock (never for "unknown")
 */
export async function login(input: LoginInput, ip: string): Promise<AuthResult> {
  const fail = async (reason: LoginFailureReason): Promise<AuthResult> => {
    await recordAuthAttempt({ ip, username: input.username, ok: false, reason });
    if (ip !== UNKNOWN_IP) {
      const ipFailures = await countRecentFailures({ ip, sinceMs: security.failureWindowMs });
      if (ipFailures >= security.ipMaxFailures) {
        await applyIpBlock(ip, `${ipFailures} failed logins in window`);
      }
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
