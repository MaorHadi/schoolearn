import argon2 from "argon2";

// OWASP-recommended argon2id parameters (19 MiB memory, 2 iterations, 1 lane).
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

/**
 * Pre-computed at module load. Login verifies against this when the user does not exist,
 * so the response takes the same time whether or not the username is real.
 */
export const DUMMY_HASH: string = await argon2.hash(crypto.randomUUID(), OPTIONS);
