import { prisma } from "~/server/database.server";
import { hashPassword } from "./password.server";
import type { RegisterInput } from "~/schemas/auth";

export type RegisterResult = { ok: true; userId: number } | { ok: false };

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
  if (taken) return { ok: false };

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
