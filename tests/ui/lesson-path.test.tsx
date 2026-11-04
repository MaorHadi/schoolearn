// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";
import { LessonPath } from "~/components/lesson-path/LessonPath";
import { findCurrentLesson } from "~/shared/lesson-path";
import type { SectionState } from "~/shared/unlock";

afterEach(cleanup);

const lesson = (
  id: number,
  sortOrder: number,
  state: Partial<SectionState["lessons"][number]>,
) => ({
  id,
  title: `Lesson ${id}`,
  sortOrder,
  passingScore: null,
  hasQuestions: true,
  unlocked: false,
  completed: false,
  bestScore: null,
  ...state,
});

const tree: SectionState[] = [
  {
    id: 1,
    title: "First section",
    sortOrder: 1,
    unlocked: true,
    completed: false,
    lessons: [
      lesson(11, 1, { unlocked: true, completed: true, bestScore: 90 }),
      lesson(12, 2, { unlocked: true }),
      lesson(13, 3, {}),
    ],
  },
  {
    id: 2,
    title: "Second section",
    sortOrder: 2,
    unlocked: false,
    completed: false,
    lessons: [lesson(21, 1, {})],
  },
];

function renderPath(data: SectionState[] = tree) {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <LessonPath slug="demo" direction="ltr" tree={data} /> },
  ]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("findCurrentLesson", () => {
  it("returns the first unlocked, not-yet-completed lesson", () => {
    expect(findCurrentLesson(tree)?.id).toBe(12);
  });
  it("returns null when everything is completed", () => {
    const done = tree.map((section) => ({
      ...section,
      unlocked: true,
      completed: true,
      lessons: section.lessons.map((entry) => ({ ...entry, unlocked: true, completed: true })),
    }));
    expect(findCurrentLesson(done)).toBeNull();
  });
});

describe("LessonPath", () => {
  it("renders completed, current, and locked stations with distinct states", () => {
    const { container } = renderPath();
    expect(container.querySelector('[data-state="completed"]')?.textContent).toContain("Lesson 11");
    expect(container.querySelector('[data-state="current"]')?.textContent).toContain("Lesson 12");
    expect(container.querySelectorAll('[data-state="locked"]')).toHaveLength(2);
  });

  it("links only unlocked lessons", () => {
    renderPath();
    const links = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(links).toEqual(["/subjects/demo/lessons/11", "/subjects/demo/lessons/12"]);
  });

  it("shows section progress and marks locked sections", () => {
    const { container } = renderPath();
    const sections = container.querySelectorAll(".path-section");
    expect(sections).toHaveLength(2);
    expect(sections[0]?.querySelector(".path-section__count")?.textContent).toBe("1/3");
    expect(sections[1]?.getAttribute("data-locked")).toBe("true");
  });

  it("shows the best score only for lessons that have questions", () => {
    const first = tree[0];
    if (!first) throw new Error("fixture");
    const { container } = renderPath([
      {
        ...first,
        lessons: [
          lesson(11, 1, { unlocked: true, completed: true, bestScore: 90 }),
          lesson(12, 2, { unlocked: true, completed: true, bestScore: 100, hasQuestions: false }),
        ],
      },
    ]);
    const metas = [...container.querySelectorAll(".station__meta")].map((node) => node.textContent);
    expect(metas[0]).toContain("90");
    expect(metas[1]).not.toContain("100");
  });

  it("exposes state to assistive tech", () => {
    const { container } = renderPath();
    const current = container.querySelector('[data-state="current"] a');
    expect(current?.getAttribute("aria-current")).toBe("step");
    const locked = container.querySelector('[data-state="locked"]');
    expect(locked?.textContent).toContain("נעול");
  });
});
