import { beforeEach, describe, expect, it } from "vitest";
import type { RouterContextProvider } from "react-router";
import { applyIpBlock, findActiveIpBlock } from "~/server/auth/ip-block.server";
import { createSession } from "~/server/auth/session.server";
import { prisma } from "~/server/database.server";
import { action as settingsAction, loader as settingsLoader } from "~/routes/system-admin/settings";
import { action as suggestionsAction } from "~/routes/system-admin/suggestions";
import { getSystemSettings } from "~/server/settings/settings.server";
import { loader as usersLoader } from "~/routes/system-admin/users";
import { action as userAction } from "~/routes/system-admin/users.$userId";
import { resetDb } from "../helpers/db";
import { contextFor, formRequest } from "../helpers/routes";

function userArgs(context: RouterContextProvider, userId: number, fields: Record<string, string>) {
  return {
    request: formRequest(`http://x/system-admin/users/${userId}`, fields),
    context,
    params: { userId: String(userId) },
  } as never;
}

describe("system-admin suggestions action", () => {
  beforeEach(resetDb);

  it("refuses users below SYSTEM_ADMIN even though the layout loader is bypassed", async () => {
    const { context } = await contextFor("ADMIN");
    await expect(
      suggestionsAction({
        request: formRequest("http://x/system-admin/suggestions", { id: "1", status: "DONE" }),
        context,
        params: {},
      } as never),
    ).rejects.toMatchObject({ init: { status: 403 } });
  });
});

describe("system-admin users", () => {
  beforeEach(resetDb);

  it("refuses ADMIN on the list and the user page", async () => {
    const { context, user } = await contextFor("ADMIN");
    await expect(
      usersLoader({
        request: new Request("http://x/system-admin/users"),
        context,
        params: {},
      } as never),
    ).rejects.toMatchObject({ init: { status: 403 } });
    await expect(
      userAction(userArgs(context, user.id, { intent: "set-role", role: "USER" })),
    ).rejects.toMatchObject({ init: { status: 403 } });
  });

  it("lists with search and paging from the query string", async () => {
    const { context } = await contextFor("SYSTEM_ADMIN", "root");
    await prisma.user.create({ data: { username: "alice", passwordHash: "x" } });
    const result = (await usersLoader({
      request: new Request("http://x/system-admin/users?q=ali&page=1"),
      context,
      params: {},
    } as never)) as { query: string; page: { users: { username: string }[]; total: number } };
    expect(result.query).toBe("ali");
    expect(result.page.users.map((user) => user.username)).toEqual(["alice"]);
    expect(result.page.total).toBe(1);
  });

  it("returns form errors for guarded changes and applies allowed ones", async () => {
    const { context, user: root } = await contextFor("SYSTEM_ADMIN", "root");
    const target = await prisma.user.create({ data: { username: "target", passwordHash: "x" } });
    await createSession(target.id, "10.0.0.1");

    expect(
      await userAction(userArgs(context, root.id, { intent: "set-role", role: "USER" })),
    ).toMatchObject({
      init: { status: 400 },
      data: { formError: "systemAdmin.error.self" },
    });

    expect(
      await userAction(userArgs(context, target.id, { intent: "set-role", role: "ADMIN" })),
    ).toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).role).toBe("ADMIN");

    expect(
      await userAction(userArgs(context, target.id, { intent: "set-disabled", disabled: "true" })),
    ).toBeNull();
    expect(await prisma.session.count({ where: { userId: target.id } })).toBe(0);

    await applyIpBlock("10.0.0.1", "test");
    expect(
      await userAction(
        userArgs(context, target.id, { intent: "clear-ip-block", ipAddress: "10.0.0.1" }),
      ),
    ).toBeNull();
    expect(await findActiveIpBlock("10.0.0.1")).toBeNull();

    expect(await userAction(userArgs(context, target.id, { intent: "clear-lockout" }))).toBeNull();
    const cleared = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(cleared.lockoutClearedAt).toBeInstanceOf(Date);

    await expect(
      userAction(userArgs(context, target.id, { intent: "nonsense" })),
    ).rejects.toMatchObject({ init: { status: 400 } });
  });
});

describe("system-admin settings", () => {
  beforeEach(resetDb);

  const settingsArgs = (context: RouterContextProvider, fields: Record<string, string>) =>
    ({
      request: formRequest("http://x/system-admin/settings", fields),
      context,
      params: {},
    }) as never;
  const validFields = {
    contactEmail: "teachers@example.org",
    suggestionsMaxPerDay: "3",
    registrationOpen: "on",
    uploadMaxMegabytes: "8",
  };

  it("refuses ADMIN on the page and the save", async () => {
    const { context } = await contextFor("ADMIN");
    await expect(settingsLoader({ context, params: {} } as never)).rejects.toMatchObject({
      init: { status: 403 },
    });
    await expect(settingsAction(settingsArgs(context, validFields))).rejects.toMatchObject({
      init: { status: 403 },
    });
    expect(await prisma.systemSetting.count()).toBe(0);
  });

  it("saves the settings and shows them back in the form's units", async () => {
    const { context } = await contextFor("SYSTEM_ADMIN");
    const { registrationOpen: _registrationOpen, ...closed } = validFields;
    expect(await settingsAction(settingsArgs(context, closed))).toBeNull();

    expect(await getSystemSettings()).toEqual({
      contactEmail: "teachers@example.org",
      suggestionsMaxPerDay: 3,
      registrationOpen: false,
      uploadMaxBytes: 8 * 1024 * 1024,
    });
    expect(await settingsLoader({ context, params: {} } as never)).toEqual({
      contactEmail: "teachers@example.org",
      suggestionsMaxPerDay: 3,
      registrationOpen: false,
      uploadMaxMegabytes: 8,
    });
  });

  it("answers invalid input with field errors and saves nothing", async () => {
    const { context } = await contextFor("SYSTEM_ADMIN");
    const invalid = await settingsAction(
      settingsArgs(context, { ...validFields, contactEmail: "nope", uploadMaxMegabytes: "500" }),
    );
    expect(invalid).toMatchObject({
      init: { status: 400 },
      data: {
        fieldErrors: {
          contactEmail: "systemAdmin.settings.error.contactEmail",
          uploadMaxMegabytes: "systemAdmin.settings.error.uploadMaxMegabytes",
        },
      },
    });
    expect(await prisma.systemSetting.count()).toBe(0);
  });
});
