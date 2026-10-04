// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";
import { SubjectCard, type SubjectCardData } from "~/components/SubjectCard";

afterEach(cleanup);

const base: SubjectCardData = {
  id: 1,
  slug: "demo",
  name: "Demo subject",
  description: "A description",
  direction: "ltr",
  accentColor: "#059669",
  icon: "flask-conical",
  enrolled: false,
  totalLessons: 4,
  completedLessons: 0,
};

function renderCard(data: SubjectCardData) {
  const Stub = createRoutesStub([{ path: "/", Component: () => <SubjectCard subject={data} /> }]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("SubjectCard", () => {
  it("applies the subject accent as a CSS variable and renders the icon", () => {
    const { container } = renderCard(base);
    const card = container.querySelector(".subject-card");
    expect(card?.getAttribute("style")).toContain("--accent: #059669");
    expect(container.querySelector("svg.lucide-flask-conical")).not.toBeNull();
  });

  it("offers enrollment when not enrolled and shows no progress", () => {
    renderCard(base);
    expect(screen.getByRole("button")).toHaveTextContent("הצטרפות");
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("links into the subject and shows progress when enrolled", () => {
    renderCard({ ...base, enrolled: true, completedLessons: 1 });
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/subjects/demo");
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("1");
    expect(bar.getAttribute("aria-valuemax")).toBe("4");
  });

  it("falls back to a safe theme when stored values are invalid", () => {
    const { container } = renderCard({ ...base, accentColor: "garbage", icon: "nope" });
    expect(container.querySelector(".subject-card")?.getAttribute("style")).toContain("#2563EB");
    expect(container.querySelector("svg.lucide-book-open")).not.toBeNull();
  });
});
