// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";
import type { ReactNode } from "react";
import { AdSlot, ForumLink, SuggestionsLink, TeacherCallout } from "~/components/SubjectsRails";

afterEach(cleanup);

function renderInRouter(element: ReactNode) {
  const Stub = createRoutesStub([{ path: "/", Component: () => <>{element}</> }]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("TeacherCallout", () => {
  it("links to the configured address with mailto", () => {
    renderInRouter(<TeacherCallout email="teachers@example.org" />);
    const link = screen.getByRole("link", { name: /יצירת קשר/ });
    expect(link).toHaveAttribute("href", "mailto:teachers@example.org");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("מורים");
  });

  it("renders nothing when no address is configured", () => {
    const { container } = renderInRouter(<TeacherCallout email={null} />);
    expect(container.querySelector(".rail__card")).toBeNull();
  });
});

describe("rail links", () => {
  it("point at the forum and suggestions pages", () => {
    renderInRouter(
      <>
        <ForumLink />
        <SuggestionsLink />
      </>,
    );
    expect(screen.getByRole("link", { name: /פורום/ })).toHaveAttribute("href", "/forum");
    expect(screen.getByRole("link", { name: /הצעות לשיפור/ })).toHaveAttribute(
      "href",
      "/suggestions",
    );
  });
});

describe("AdSlot", () => {
  it("is an empty reserved element hidden from assistive tech", () => {
    const { container } = renderInRouter(<AdSlot />);
    const slot = container.querySelector(".rail__ad");
    expect(slot).not.toBeNull();
    expect(slot).toBeEmptyDOMElement();
    expect(slot).toHaveAttribute("aria-hidden", "true");
  });
});
