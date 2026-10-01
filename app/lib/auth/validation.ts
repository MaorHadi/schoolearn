// Shared between server and client (form validation). No server imports here.
import { z } from "zod";

export const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export const RegisterSchema = z.object({
  username: z.string().regex(USERNAME_RE),
  email: z.preprocess((v) => (v === "" ? undefined : v), z.email().optional()),
  password: z.string().min(8).max(200),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  username: z.string().min(1).max(32),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof LoginSchema>;

/** Internal reasons recorded in AuthLog. Never shown to the user. */
export type LoginFailureReason =
  "USER_NOT_FOUND" | "BAD_PASSWORD" | "USER_DISABLED" | "USERNAME_LOCKED" | "IP_BLOCKED";
