import type { SuggestionStatus } from "~/schemas/feedback";
import { prisma } from "~/server/database.server";
import { env } from "~/server/env.server";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CreateSuggestionResult = { ok: true; id: number } | { ok: false; reason: "THROTTLED" };

/**
 * Writer of `Suggestion` rows (see also updateSuggestionStatus). Refuses once the user has already submitted
 * SUGGESTIONS_MAX_PER_DAY suggestions in the last 24 hours (counted from the table itself).
 */
export async function createSuggestion(
  userId: number,
  body: string,
  now: Date = new Date(),
): Promise<CreateSuggestionResult> {
  const since = new Date(now.getTime() - DAY_MS);
  const recent = await prisma.suggestion.count({ where: { userId, createdAt: { gte: since } } });
  if (recent >= env.SUGGESTIONS_MAX_PER_DAY) return { ok: false, reason: "THROTTLED" };

  const created = await prisma.suggestion.create({
    data: { userId, body, createdAt: now },
    select: { id: true },
  });
  return { ok: true, id: created.id };
}

/** Triage: set a suggestion's status. Returns false when the id does not exist. */
export async function updateSuggestionStatus(
  id: number,
  status: SuggestionStatus,
): Promise<boolean> {
  const result = await prisma.suggestion.updateMany({ where: { id }, data: { status } });
  return result.count === 1;
}

export interface SuggestionListItem {
  id: number;
  body: string;
  status: "NEW" | "REVIEWED" | "DONE";
  createdAt: Date;
  /** null when the author's account was deleted. */
  username: string | null;
}

/** Newest first. TODO(suggestions-triage): filters by status and pagination. */
export async function listSuggestions(): Promise<SuggestionListItem[]> {
  const rows = await prisma.suggestion.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      body: true,
      status: true,
      createdAt: true,
      user: { select: { username: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    status: row.status,
    createdAt: row.createdAt,
    username: row.user?.username ?? null,
  }));
}
