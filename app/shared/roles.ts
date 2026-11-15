// Shared (client-safe). Mirrors the Prisma Role enum without importing Prisma.
export const ROLES = ["USER", "ADMIN", "SYSTEM_ADMIN"] as const;
export type Role = (typeof ROLES)[number];

/** Higher rank includes every permission of the ranks below it. */
const ROLE_RANK: Record<Role, number> = { USER: 0, ADMIN: 1, SYSTEM_ADMIN: 2 };

export function hasRole(userRole: Role, min: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[min];
}
