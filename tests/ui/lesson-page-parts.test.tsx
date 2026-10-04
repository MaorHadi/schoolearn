// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";
import { BookOpen } from "lucide-react";
import { QuestionsPlaceholder } from "~/components/QuestionsPlaceholder";
import { StubPage } from "~/components/StubPage";
import { t } from "~/i18n";

afterEach(cleanup);

describe("QuestionsPlaceholder", () => {
  it("is a labelled section that explains itself and links back to the path", () => {
    const Stub = createRoutesStub([
      { path: "/", Component: () => <QuestionsPlaceholder backTo="/subjects/demo" /> },
    ]);
    render(<Stub initialEntries={["/"]} />);
    const section = screen.getByRole("region", { name: t("lesson.questionsTitle") });
    expect(section).toHaveTextContent(t("lesson.questionsPlaceholder"));
    expect(screen.getByRole("link").getAttribute("href")).toBe("/subjects/demo");
  });
});

describe("StubPage", () => {
  it("renders title, lead, and the not-available message", () => {
    render(<StubPage icon={BookOpen} title="Title" lead="Lead" message="Not yet" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Title");
    expect(screen.getByText("Lead")).toBeTruthy();
    expect(screen.getByText("Not yet")).toBeTruthy();
  });
});
