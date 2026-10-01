import { beforeEach, describe, expect, it } from "vitest";
import { RouterContextProvider } from "react-router";
import { authMiddleware } from "~/middleware/auth.server";
import { userContext, clientIpContext } from "~/lib/auth/context.server";
import { createSession } from "~/lib/auth/session.server";
import { registerUser } from "~/lib/auth/register.server";
import { applyIpBlock } from "~/lib/auth/ip-block.server";
import { prisma } from "~/lib/database.server";
import { requestWithCookie, resetDb } from "../helpers/db";

/** Normalize what middleware can throw: a Response (redirect) or a data() payload. */
function asThrown(e: unknown): { status: number; headers: Headers; body: unknown } {
  if (e instanceof Response) return { status: e.status, headers: e.headers, body: null };
  if (e && typeof e === "object" && "init" in e && "data" in e) {
    const d = e as { data: unknown; init?: ResponseInit };
    return { status: d.init?.status ?? 200, headers: new Headers(d.init?.headers), body: d.data };
  }
  throw e;
}

async function run(request: Request) {
  const context = new RouterContextProvider();
  const next = () => Promise.resolve(new Response("ok"));
  try {
    const res = await authMiddleware({ request, context, params: {} } as never, next);
    return { res: res as Response, context, thrown: null };
  } catch (e) {
    return { res: null, context, thrown: asThrown(e) };
  }
}

describe("authMiddleware", () => {
  let cookie: string;
  let userId: number;

  beforeEach(async () => {
    await resetDb();
    const r = await registerUser({ username: "alice", password: "password1" });
    if (!r.ok) throw new Error("register failed");
    userId = r.userId;
    cookie = (await createSession(userId, null)).cookie;
  });

  it("lets public paths through without a session", async () => {
    const { res } = await run(new Request("http://x/login"));
    expect(res?.status).toBe(200);
  });

  it("redirects to login with redirectTo when there is no session", async () => {
    const { thrown } = await run(new Request("http://x/subjects/abc?tab=1"));
    expect(thrown?.status).toBe(302);
    expect(thrown?.headers.get("Location")).toBe("/login?redirectTo=%2Fsubjects%2Fabc%3Ftab%3D1");
  });

  it("sets user and client IP context when the session is valid", async () => {
    const { res, context } = await run(requestWithCookie("http://x/subjects", cookie));
    expect(res?.status).toBe(200);
    expect(context.get(userContext)?.id).toBe(userId);
    expect(context.get(clientIpContext)).toBe("unknown");
  });

  it("rejects an expired session, deletes it, and clears the cookie", async () => {
    await prisma.session.updateMany({ data: { expirationDate: new Date(Date.now() - 1) } });
    const { thrown } = await run(requestWithCookie("http://x/subjects", cookie));
    expect(thrown?.status).toBe(302);
    expect(thrown?.headers.get("Set-Cookie")).toMatch(/Max-Age=0/);
    expect(await prisma.session.count()).toBe(0);
  });

  it("rejects a disabled user with an otherwise valid session", async () => {
    await prisma.user.update({ where: { id: userId }, data: { isDisabled: true } });
    const { thrown } = await run(requestWithCookie("http://x/subjects", cookie));
    expect(thrown?.status).toBe(302);
    expect(await prisma.session.count()).toBe(0);
  });

  it("returns 403 for a blocked IP even on public paths", async () => {
    await applyIpBlock("5.5.5.5", "test");
    const req = new Request("http://x/login", { headers: { "x-forwarded-for": "5.5.5.5" } });
    const { thrown } = await run(req);
    expect(thrown?.status).toBe(403);
  });
});
