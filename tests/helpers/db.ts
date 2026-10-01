import { prisma } from "~/lib/database.server";

/** Wipe all tables. Cascades handle children of User and Subject. */
export async function resetDb() {
  await prisma.$transaction([
    prisma.ipBlock.deleteMany(),
    prisma.authLog.deleteMany(),
    prisma.session.deleteMany(),
    prisma.lessonAttempt.deleteMany(),
    prisma.lessonProgress.deleteMany(),
    prisma.material.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

/** Build a Request carrying the cookie pair from a Set-Cookie header value. */
export function requestWithCookie(url: string, cookie: string | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("Cookie", cookie.split(";")[0] ?? "");
  return new Request(url, { ...init, headers });
}
