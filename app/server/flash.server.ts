import type { RouterContextProvider } from "react-router";
import type { Prisma } from "../../prisma/generated/client/client";
import type { TranslationKey } from "~/i18n";
import { ToastSchema, type Toast, type ToastKind } from "~/schemas/toast";
import { sessionContext } from "~/server/auth/context.server";
import type { SessionWithUser } from "~/server/auth/session.server";
import { prisma } from "~/server/database.server";

/**
 * One-shot toasts ("flash") stored in `Session.sessionData.flash`. An action calls `setFlash`;
 * the root loader on the next render calls `takeFlash`, which returns the toast and clears it.
 * Surviving a redirect is the point: the toast is in the DB, not in the response.
 */

const FLASH_KEY = "flash";

function readData(session: SessionWithUser): Record<string, unknown> {
  const raw: unknown = session.sessionData;
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

export async function setFlash(
  sessionId: string,
  kind: ToastKind,
  key: TranslationKey,
  values?: Record<string, string>,
): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { sessionData: true },
  });
  if (!session) return;
  const existing: unknown = session.sessionData;
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  const toast: Toast = { id: crypto.randomUUID(), kind, key, ...(values ? { values } : {}) };
  const sessionData = { ...base, [FLASH_KEY]: toast } as unknown as Prisma.InputJsonObject;
  await prisma.session.update({ where: { id: sessionId }, data: { sessionData } });
}

/** Return the pending toast (if any) and clear it. Writes only when there was one. */
export async function takeFlash(session: SessionWithUser): Promise<Toast | null> {
  const base = readData(session);
  if (!(FLASH_KEY in base)) return null;

  const parsed = ToastSchema.safeParse(base[FLASH_KEY]);
  const { [FLASH_KEY]: _dropped, ...rest } = base;
  await prisma.session.updateMany({
    where: { id: session.id },
    data: { sessionData: rest as Prisma.InputJsonObject },
  });
  return parsed.success ? (parsed.data as Toast) : null;
}

/** Convenience for actions: flash on the request's session, if any. */
export async function flashFromContext(
  context: Readonly<RouterContextProvider>,
  kind: ToastKind,
  key: TranslationKey,
  values?: Record<string, string>,
): Promise<void> {
  const session = context.get(sessionContext);
  if (session) await setFlash(session.id, kind, key, values);
}
