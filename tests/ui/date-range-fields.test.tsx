// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { DateRangeFields } from "~/components/forms/DateRangeFields";
import { t } from "~/i18n";

afterEach(cleanup);

beforeAll(() => {
  // Radix popovers position themselves with floating-ui, which needs ResizeObserver.
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverStub });
});

function hiddenValue(container: HTMLElement, name: string) {
  return container.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;
}

describe("DateRangeFields", () => {
  it("posts the defaults as hidden yyyy-mm-dd fields under the given names", () => {
    const { container } = render(
      <DateRangeFields
        names={{ from: "since", to: "until" }}
        defaultFrom="2026-11-01"
        defaultTo="2026-11-05"
      />,
    );
    expect(hiddenValue(container, "since")).toBe("2026-11-01");
    expect(hiddenValue(container, "until")).toBe("2026-11-05");
  });

  it("picks a day from the calendar and keeps the start before the end", () => {
    const { container } = render(
      <DateRangeFields defaultFrom="2026-11-10" defaultTo="2026-11-20" />,
    );
    fireEvent.click(screen.getByRole("button", { name: t("dateRange.from") }));
    const dayButtons = screen.getAllByRole("button", { name: /2026/ });
    const picked = dayButtons.find((button) => button.textContent?.trim() === "5");
    const beyondEnd = dayButtons.find((button) => button.textContent?.trim() === "25");
    if (!picked || !beyondEnd) throw new Error("calendar days missing");
    expect(beyondEnd).toBeDisabled();
    fireEvent.click(picked);
    expect(hiddenValue(container, "from")).toBe("2026-11-05");
    expect(hiddenValue(container, "to")).toBe("2026-11-20");
  });
});
