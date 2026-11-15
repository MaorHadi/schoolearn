// Client-safe. Shape of a one-shot notification carried from an action to the next render.
import { z } from "zod";
import type { TranslationKey } from "~/i18n";

const TOAST_KINDS = ["success", "info", "error"] as const;
export type ToastKind = (typeof TOAST_KINDS)[number];

export const ToastSchema = z.object({
  /** Unique per toast so the client can tell a new toast from a re-render of the old one. */
  id: z.string().min(1),
  kind: z.enum(TOAST_KINDS),
  /** Translation key; `values` fill `{placeholders}` in the string. */
  key: z.string().min(1),
  values: z.record(z.string(), z.string()).optional(),
});

export interface Toast {
  id: string;
  kind: ToastKind;
  key: TranslationKey;
  values?: Record<string, string>;
}
