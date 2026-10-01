// Shared (client-safe). Mirrors the Prisma Role enum without importing Prisma.
export type Role = "USER" | "ADMIN" | "SYSTEM_ADMIN";

/** Higher rank includes every permission of the ranks below it. */
export const ROLE_RANK: Record<Role, number> = { USER: 0, ADMIN: 1, SYSTEM_ADMIN: 2 };

export function hasRole(userRole: Role, min: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[min];
}
