// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BookOpen } from "lucide-react";
import { StubPage } from "~/components/StubPage";

afterEach(cleanup);

describe("StubPage", () => {
  it("renders title, lead, and the not-available message", () => {
    render(<StubPage icon={BookOpen} title="Title" lead="Lead" message="Not yet" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Title");
    expect(screen.getByText("Lead")).toBeTruthy();
    expect(screen.getByText("Not yet")).toBeTruthy();
  });
});
