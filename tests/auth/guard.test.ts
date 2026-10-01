import { beforeEach, describe, expect, it } from "vitest";
import { RouterContextProvider } from "react-router";
import { authMiddleware } from "~/server/auth/middleware.server";
import { userContext, clientIpContext } from "~/server/auth/context.server";
import { createSession } from "~/server/auth/session.server";
import { registerUser } from "~/server/auth/register.server";
import { applyIpBlock } from "~/server/auth/ip-block.server";
import { prisma } from "~/server/database.server";
import { requestWithCookie, resetDb } from "../helpers/db";

/** Normalize what middleware can throw: a Response (redirect) or a data() payload. */
function asThrown(thrown: unknown): { status: number; headers: Headers; body: unknown } {
  if (thrown instanceof Response) {
    return { status: thrown.status, headers: thrown.headers, body: null };
  }
  if (thrown && typeof thrown === "object" && "init" in thrown && "data" in thrown) {
    const payload = thrown as { data: unknown; init?: ResponseInit };
    return {
      status: payload.init?.status ?? 200,
      headers: new Headers(payload.init?.headers),
      body: payload.data,
    };
  }
  throw thrown;
}

async function run(request: Request) {
  const context = new RouterContextProvider();
  const next = () => Promise.resolve(new Response("ok"));
  try {
    const response = await authMiddleware({ request, context, params: {} } as never, next);
    return { response: response as Response, context, thrown: null };
  } catch (error) {
    return { response: null, context, thrown: asThrown(error) };
  }
}

describe("authMiddleware", () => {
  let cookie: string;
  let userId: number;

  beforeEach(async () => {
    await resetDb();
    const registered = await registerUser({ username: "alice", password: "password1" });
    if (!registered.ok) throw new Error("register failed");
    userId = registered.userId;
    cookie = (await createSession(userId, null)).cookie;
  });

  it("lets public paths through without a session", async () => {
    const { response } = await run(new Request("http://x/login"));
    expect(response?.status).toBe(200);
  });

  it("redirects to login with redirectTo when there is no session", async () => {
    const { thrown } = await run(new Request("http://x/subjects/abc?tab=1"));
    expect(thrown?.status).toBe(302);
    expect(thrown?.headers.get("Location")).toBe("/login?redirectTo=%2Fsubjects%2Fabc%3Ftab%3D1");
  });

  it("sets user and client IP context when the session is valid", async () => {
    const { response, context } = await run(requestWithCookie("http://x/subjects", cookie));
    expect(response?.status).toBe(200);
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
    const blockedRequest = new Request("http://x/login", {
      headers: { "x-forwarded-for": "5.5.5.5" },
    });
    const { thrown } = await run(blockedRequest);
    expect(thrown?.status).toBe(403);
  });
});
