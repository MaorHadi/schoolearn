import { prisma } from "~/server/database.server";
import { security } from "~/server/security.server";
import type { RegisterFailureReason, RegisterInput } from "~/schemas/auth";
import { countRecentRegistrations, recordRegisterAttempt } from "./auth-log.server";
import { UNKNOWN_IP } from "./client-ip.server";
import { hashPassword } from "./password.server";

export type RegisterResult =
  { ok: true; userId: number } | { ok: false; reason: RegisterFailureReason };

/**
 * Registration entry point for routes: applies the per-IP throttle and logs every attempt.
 * The "unknown" IP is never throttled, so a missing proxy config cannot close registration.
 */
export async function register(input: RegisterInput, ip: string): Promise<RegisterResult> {
  if (ip !== UNKNOWN_IP) {
    const recent = await countRecentRegistrations(ip, security.registerWindowMs);
    if (recent >= security.registerMaxPerIp) {
      await recordRegisterAttempt({
        ip,
        username: input.username,
        ok: false,
        reason: "REGISTER_THROTTLED",
      });
      return { ok: false, reason: "REGISTER_THROTTLED" };
    }
  }
  const result = await registerUser(input);
  await recordRegisterAttempt({
    ip,
    username: input.username,
    ok: result.ok,
    ...(result.ok ? {} : { reason: result.reason }),
  });
  return result;
}

/** Create a USER. Any failure (duplicate username/email or otherwise) is reported generically. */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  // Cheap pre-check so a duplicate username/email does not cost an argon2 hash.
  // The create below still handles the race via the unique constraints.
  const taken = await prisma.user.findFirst({
    where: {
      OR: [{ username: input.username }, ...(input.email ? [{ email: input.email }] : [])],
    },
    select: { id: true },
  });
  if (taken) return { ok: false, reason: "DUPLICATE" };

  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: { username: input.username, email: input.email ?? null, passwordHash },
    });
    return { ok: true, userId: user.id };
  } catch {
    return { ok: false, reason: "DUPLICATE" };
  }
}
