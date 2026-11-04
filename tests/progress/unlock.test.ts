import { describe, expect, it } from "vitest";
import {
  computeTree,
  findLesson,
  findNextLesson,
  isLessonUnlocked,
  type SectionNode,
} from "~/shared/unlock";

const lesson = (id: number, sortOrder: number) => ({
  id,
  title: `L${id}`,
  sortOrder,
  passingScore: null,
  hasQuestions: true,
});

const sections: SectionNode[] = [
  { id: 1, title: "S1", sortOrder: 1, lessons: [lesson(11, 1), lesson(12, 2)] },
  { id: 2, title: "S2", sortOrder: 2, lessons: [lesson(21, 1), lesson(22, 3)] }, // gap in sortOrder
  { id: 3, title: "S3", sortOrder: 5, lessons: [] }, // empty section, gap in section order
  { id: 4, title: "S4", sortOrder: 6, lessons: [lesson(41, 1)] },
];

const done = (lessonId: number) => ({ lessonId, bestScore: 100, completedAt: new Date() });

describe("computeTree", () => {
  it("unlocks only the first lesson of the first section with no progress", () => {
    const tree = computeTree(sections, []);
    expect(tree[0]?.unlocked).toBe(true);
    expect(tree[0]?.lessons.map((entry) => entry.unlocked)).toEqual([true, false]);
    expect(tree[1]?.unlocked).toBe(false);
    expect(tree[1]?.lessons.every((entry) => !entry.unlocked)).toBe(true);
  });

  it("unlocks the next lesson when the previous one is completed", () => {
    const tree = computeTree(sections, [done(11)]);
    expect(tree[0]?.lessons.map((entry) => entry.unlocked)).toEqual([true, true]);
    expect(tree[1]?.unlocked).toBe(false);
  });

  it("unlocks the next section when all lessons of the previous are completed, by order not arithmetic", () => {
    const tree = computeTree(sections, [done(11), done(12)]);
    expect(tree[0]?.completed).toBe(true);
    expect(tree[1]?.unlocked).toBe(true);
    expect(tree[1]?.lessons.map((entry) => entry.unlocked)).toEqual([true, false]);
    expect(tree[1]?.lessons[1]?.sortOrder).toBe(3);
  });

  it("treats an empty section as completed so it does not dead-end progression", () => {
    const tree = computeTree(sections, [done(11), done(12), done(21), done(22)]);
    expect(tree[2]?.unlocked).toBe(true);
    expect(tree[2]?.completed).toBe(true);
    expect(tree[3]?.unlocked).toBe(true);
    expect(tree[3]?.lessons[0]?.unlocked).toBe(true);
  });

  it("a failed attempt records bestScore but does not complete or unlock", () => {
    const tree = computeTree(sections, [{ lessonId: 11, bestScore: 40, completedAt: null }]);
    expect(tree[0]?.lessons[0]).toMatchObject({ completed: false, bestScore: 40 });
    expect(tree[0]?.lessons[1]?.unlocked).toBe(false);
  });

  it("sorts sections and lessons by sortOrder regardless of input order", () => {
    const second = sections[1];
    if (!second) throw new Error("fixture");
    const shuffled = [
      sections[3],
      sections[0],
      sections[2],
      { ...second, lessons: [...second.lessons].reverse() },
    ].filter((entry): entry is SectionNode => entry !== undefined);
    const tree = computeTree(shuffled, []);
    expect(tree.map((section) => section.id)).toEqual([1, 2, 3, 4]);
    expect(tree[1]?.lessons.map((entry) => entry.id)).toEqual([21, 22]);
  });

  it("completed lessons stay completed and unlocked even after later lessons are also done", () => {
    const tree = computeTree(sections, [done(11), done(12), done(21)]);
    expect(tree[0]?.lessons.every((entry) => entry.completed && entry.unlocked)).toBe(true);
  });
});

describe("isLessonUnlocked", () => {
  it("finds a lesson anywhere in the tree", () => {
    const tree = computeTree(sections, [done(11)]);
    expect(isLessonUnlocked(tree, 11)).toBe(true);
    expect(isLessonUnlocked(tree, 12)).toBe(true);
    expect(isLessonUnlocked(tree, 21)).toBe(false);
    expect(isLessonUnlocked(tree, 999)).toBe(false);
  });
});

describe("findNextLesson", () => {
  const tree = computeTree(sections, []);

  it("returns the next lesson in the same section", () => {
    expect(findNextLesson(tree, 11)?.id).toBe(12);
  });

  it("crosses into the next section, skipping empty sections", () => {
    expect(findNextLesson(tree, 12)?.id).toBe(21);
    expect(findNextLesson(tree, 22)?.id).toBe(41); // S3 is empty
  });

  it("returns null after the last lesson or for an unknown lesson", () => {
    expect(findNextLesson(tree, 41)).toBeNull();
    expect(findNextLesson(tree, 999)).toBeNull();
  });

  it("findLesson returns state or null", () => {
    expect(findLesson(tree, 11)?.unlocked).toBe(true);
    expect(findLesson(tree, 999)).toBeNull();
  });
});
