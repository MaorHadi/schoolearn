// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";
import { ThemeToggle } from "~/components/ThemeToggle";

afterEach(cleanup);

function renderToggle() {
  const Stub = createRoutesStub([{ path: "/", Component: () => <ThemeToggle /> }]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("ThemeToggle", () => {
  it("is a single button carrying both icons", () => {
    const { container } = renderToggle();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(container.querySelectorAll("svg")).toHaveLength(2);
    expect(container.querySelector(".theme-toggle__sun")).not.toBeNull();
    expect(container.querySelector(".theme-toggle__moon")).not.toBeNull();
  });

  it("has an accessible label and does not submit a page-reloading form", () => {
    const { container } = renderToggle();
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBeTruthy();
    expect(button.getAttribute("type")).toBe("button");
    expect(container.querySelector("form")).toBeNull();
  });
});
