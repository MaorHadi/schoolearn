import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "~/server/database.server";
import { env } from "~/server/env.server";
import {
  createSuggestion,
  listSuggestions,
  updateSuggestionStatus,
} from "~/server/feedback/suggestions.server";
import { resetDb } from "../helpers/db";

const HOUR_MS = 60 * 60 * 1000;

async function makeUser(username: string) {
  return prisma.user.create({ data: { username, passwordHash: "x" } });
}

describe("createSuggestion", () => {
  beforeEach(resetDb);

  it("stores the body for the user with status NEW", async () => {
    const user = await makeUser("alice");
    const result = await createSuggestion(user.id, "Please add dark mode to lessons.");
    expect(result.ok).toBe(true);
    const rows = await prisma.suggestion.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: user.id, status: "NEW" });
  });

  it("throttles after SUGGESTIONS_MAX_PER_DAY submissions within 24 hours", async () => {
    const user = await makeUser("alice");
    const now = new Date();
    for (let index = 0; index < env.SUGGESTIONS_MAX_PER_DAY; index++) {
      expect((await createSuggestion(user.id, `suggestion number ${index}`, now)).ok).toBe(true);
    }
    expect(await createSuggestion(user.id, "one more suggestion", now)).toEqual({
      ok: false,
      reason: "THROTTLED",
    });
  });

  it("does not count submissions older than 24 hours, nor other users'", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");
    const now = new Date();
    const yesterday = new Date(now.getTime() - 25 * HOUR_MS);
    for (let index = 0; index < env.SUGGESTIONS_MAX_PER_DAY; index++) {
      await createSuggestion(alice.id, `old suggestion ${index}`, yesterday);
      await createSuggestion(bob.id, `bob suggestion ${index}`, now);
    }
    expect((await createSuggestion(alice.id, "fresh suggestion today", now)).ok).toBe(true);
  });
});

describe("updateSuggestionStatus", () => {
  beforeEach(resetDb);

  it("changes the status and reports a missing id", async () => {
    const user = await makeUser("alice");
    const created = await createSuggestion(user.id, "a suggestion worth triaging");
    if (!created.ok) throw new Error("expected ok");
    expect(await updateSuggestionStatus(created.id, "DONE")).toBe(true);
    expect((await listSuggestions())[0]?.status).toBe("DONE");
    expect(await updateSuggestionStatus(created.id + 999, "REVIEWED")).toBe(false);
  });
});

describe("listSuggestions", () => {
  beforeEach(resetDb);

  it("returns newest first with the username, and null for deleted authors", async () => {
    const alice = await makeUser("alice");
    const bob = await makeUser("bob");
    const now = new Date();
    await createSuggestion(alice.id, "the older suggestion", new Date(now.getTime() - HOUR_MS));
    await createSuggestion(bob.id, "the newer suggestion", now);
    await prisma.user.delete({ where: { id: bob.id } });

    const list = await listSuggestions();
    expect(list.map((item) => [item.body, item.username, item.status])).toEqual([
      ["the newer suggestion", null, "NEW"],
      ["the older suggestion", "alice", "NEW"],
    ]);
  });
});
