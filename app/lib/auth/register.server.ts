import { prisma } from "~/lib/database.server";
import { hashPassword } from "./password.server";
import type { RegisterInput } from "./validation";

export type RegisterResult = { ok: true; userId: number } | { ok: false };

/** Create a USER. Any failure (duplicate username/email or otherwise) is reported generically. */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: { username: input.username, email: input.email ?? null, passwordHash },
    });
    return { ok: true, userId: user.id };
  } catch {
    return { ok: false };
  }
}
