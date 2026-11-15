// Client-safe. Validation for the SYSTEM_ADMIN user management pages.
import { z } from "zod";
import { ROLES } from "~/shared/roles";

export const USER_SEARCH_MAX_LENGTH = 64;

/** `?q=` and `?page=` on the user list. */
export const UserListQuerySchema = z.object({
  q: z.string().trim().max(USER_SEARCH_MAX_LENGTH).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

/** Everything the user page can do, keyed by the `intent` field. */
export const UserPageIntentSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("set-role"), role: z.enum(ROLES) }),
  z.object({
    intent: z.literal("set-disabled"),
    disabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  }),
  z.object({ intent: z.literal("clear-lockout") }),
  z.object({ intent: z.literal("clear-ip-block"), ipAddress: z.string().trim().min(1).max(64) }),
]);
