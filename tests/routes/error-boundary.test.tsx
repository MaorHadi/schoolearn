// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ErrorBoundary } from "~/root";
import { t } from "~/i18n";

afterEach(cleanup);

/** Shape React Router uses for thrown Responses / data() payloads. */
function routeError(status: number, data: unknown) {
  return { status, statusText: "", internal: false, data };
}

const props = { params: {}, loaderData: undefined, actionData: undefined };

describe("root ErrorBoundary", () => {
  it("shows the translated not-found text for any 404, including React Router's English default", () => {
    render(<ErrorBoundary {...props} error={routeError(404, 'No route matches URL "/nope"')} />);
    expect(screen.getByText(t("error.notFound"))).toBeTruthy();
    expect(screen.queryByText(/No route matches/)).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("404");
  });

  it("shows the thrown message for other route errors when it is a string", () => {
    render(<ErrorBoundary {...props} error={routeError(403, t("error.lessonLocked"))} />);
    expect(screen.getByText(t("error.lessonLocked"))).toBeTruthy();
  });

  it("falls back to the generic translated message for non-string data and plain errors", () => {
    const first = render(<ErrorBoundary {...props} error={routeError(500, { weird: true })} />);
    expect(screen.getByText(t("error.generic"))).toBeTruthy();
    first.unmount();
    render(<ErrorBoundary {...props} error={new Error("boom")} />);
    expect(screen.getByText(t("error.generic"))).toBeTruthy();
    expect(screen.queryByText(/boom/)).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(t("error.title"));
  });
});
