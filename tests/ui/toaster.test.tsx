// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Toaster } from "~/components/Toaster";
import { t } from "~/i18n";
import type { Toast } from "~/schemas/toast";

afterEach(cleanup);

const toast: Toast = {
  id: "t1",
  kind: "success",
  key: "toast.enrolled",
  values: { subject: "Demo subject" },
};

describe("Toaster", () => {
  it("renders nothing visible without a toast but keeps the live region", () => {
    render(<Toaster toast={null} />);
    const region = screen.getByRole("status");
    expect(region).toBeEmptyDOMElement();
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("shows the translated text with values filled in and the kind as a class", () => {
    const { container } = render(<Toaster toast={toast} />);
    expect(screen.getByText(t("toast.enrolled").replace("{subject}", "Demo subject"))).toBeTruthy();
    expect(container.querySelector(".toast--success")).not.toBeNull();
    expect(container.querySelector("svg.lucide-circle-check")).not.toBeNull();
  });

  it("can be dismissed and does not duplicate the same toast on re-render", () => {
    const { rerender } = render(<Toaster toast={toast} />);
    rerender(<Toaster toast={{ ...toast }} />);
    expect(screen.getAllByRole("button", { name: t("toast.dismiss") })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: t("toast.dismiss") }));
    expect(screen.queryByRole("button")).toBeNull();
  });
});
