// Client-safe. Validation for user feedback forms.
import { z } from "zod";

export const SUGGESTION_MIN_LENGTH = 10;
export const SUGGESTION_MAX_LENGTH = 2000;

export const SuggestionSchema = z.object({
  body: z.string().trim().min(SUGGESTION_MIN_LENGTH).max(SUGGESTION_MAX_LENGTH),
});

export type SuggestionInput = z.infer<typeof SuggestionSchema>;

export const SUGGESTION_STATUSES = ["NEW", "REVIEWED", "DONE"] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export const SuggestionStatusUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(SUGGESTION_STATUSES),
});
