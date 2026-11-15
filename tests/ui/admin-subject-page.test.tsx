// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";
import { StructureTree, type TreeSection } from "~/components/admin/StructureTree";
import { SubjectForm } from "~/components/admin/SubjectForm";
import { t } from "~/i18n";
import { CONTENT_LOCALES } from "~/shared/content-locales";
import { SUBJECT_ICONS } from "~/shared/subject-theme";

afterEach(cleanup);

const lesson = (id: number, title: string) => ({
  id,
  title,
  sortOrder: id,
  passingScore: null,
  publishedAt: null,
  hasDraft: false,
});

const sections: TreeSection[] = [
  {
    id: 1,
    title: "First",
    sortOrder: 1,
    publishedAt: null,
    lessons: [lesson(11, "Alpha"), lesson(12, "Beta"), lesson(13, "Gamma")],
  },
  { id: 2, title: "Second", sortOrder: 2, publishedAt: null, lessons: [lesson(21, "Delta")] },
];

describe("SubjectForm", () => {
  function renderForm() {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <SubjectForm
            intent="update-subject"
            submitLabel="save"
            values={{
              slug: "sample",
              name: "Sample",
              description: null,
              locale: "en",
              direction: "ltr",
              accentColor: "#112233",
              icon: "atom",
            }}
          />
        ),
      },
    ]);
    return render(<Stub initialEntries={["/"]} />);
  }

  it("offers the content language as a dropdown of the supported languages", () => {
    renderForm();
    const select = screen.getByLabelText(t("admin.subject.form.locale"));
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveValue("en");
    expect(within(select).getAllByRole("option")).toHaveLength(CONTENT_LOCALES.length);
  });

  it("shows every icon as a picture to pick, with the current one selected", () => {
    const { container } = renderForm();
    const group = screen.getByRole("group", { name: t("admin.subject.form.icon") });
    const options = within(group).getAllByRole("radio");
    expect(options).toHaveLength(SUBJECT_ICONS.length);
    expect(group.querySelectorAll("svg")).toHaveLength(SUBJECT_ICONS.length);
    expect(within(group).getByRole("radio", { name: t("admin.subject.icon.atom") })).toBeChecked();
    expect(container.querySelector('[name="sortOrder"]')).toBeNull();
  });
});

describe("StructureTree", () => {
  function renderTree() {
    const posted: Record<string, FormDataEntryValue>[] = [];
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => <StructureTree sections={sections} direction="ltr" />,
        action: async ({ request }) => {
          posted.push(Object.fromEntries(await request.formData()));
          return null;
        },
      },
    ]);
    render(<Stub initialEntries={["/"]} />);
    return posted;
  }

  it("posts a reorder when a lesson is dragged onto another lesson of its section", async () => {
    const posted = renderTree();
    const handles = screen.getAllByRole("button", { name: t("admin.lessons.drag") });
    const [firstHandle, , thirdHandle] = handles;
    const targetRow = thirdHandle?.closest("li");
    if (!firstHandle || !targetRow) throw new Error("row missing");

    fireEvent.dragStart(firstHandle);
    fireEvent.dragEnter(targetRow);
    expect(targetRow).toHaveAttribute("data-drag", "target");
    fireEvent.drop(targetRow);

    await waitFor(() =>
      expect(posted).toEqual([{ intent: "reorder-lesson", lessonId: "11", targetLessonId: "13" }]),
    );
  });

  it("ignores a lesson dropped on another section's lesson", () => {
    const posted = renderTree();
    const handles = screen.getAllByRole("button", { name: t("admin.lessons.drag") });
    const otherSectionRow = handles[3]?.closest("li");
    if (!handles[0] || !otherSectionRow) throw new Error("row missing");

    fireEvent.dragStart(handles[0]);
    fireEvent.dragEnter(otherSectionRow);
    expect(otherSectionRow).not.toHaveAttribute("data-drag");
    fireEvent.drop(otherSectionRow);
    expect(posted).toEqual([]);
  });

  it("moves a section with the arrow keys on its handle", async () => {
    const posted = renderTree();
    const [, secondHandle] = screen.getAllByRole("button", { name: t("admin.sections.drag") });
    if (!secondHandle) throw new Error("handle missing");
    fireEvent.keyDown(secondHandle, { key: "ArrowUp" });
    await waitFor(() => expect(posted).toEqual([{ intent: "move-section-up", sectionId: "2" }]));
  });
});
