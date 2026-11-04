// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";
import { BlockEditor, blocksAreComplete } from "~/components/content-editor/BlockEditor";
import { t } from "~/i18n";
import type { ContentBlock } from "~/schemas/content-blocks";

afterEach(cleanup);

const initial: ContentBlock[] = [
  { id: "h1", type: "heading", level: 1, text: "Title" },
  { id: "p1", type: "paragraph", content: [{ text: "Body", marks: [] }] },
];

function renderEditor(blocks: ContentBlock[] = initial) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => <BlockEditor initialBlocks={blocks} direction="ltr" initialAssetUrls={{}} />,
      action: () => null,
    },
  ]);
  const view = render(<Stub initialEntries={["/"]} />);
  const hidden = () => {
    const input = view.container.querySelector<HTMLInputElement>('input[name="blocks"]');
    if (!input) throw new Error("hidden blocks input missing");
    return JSON.parse(input.value) as ContentBlock[];
  };
  return { ...view, hidden };
}

describe("BlockEditor", () => {
  it("posts the initial blocks as JSON and previews them", () => {
    const { hidden } = renderEditor();
    expect(hidden()).toEqual(initial);
    const preview = screen.getByRole("complementary", { name: t("admin.editor.preview") });
    expect(within(preview).getByRole("heading", { level: 1 })).toHaveTextContent("Title");
    expect(preview).toHaveTextContent("Body");
  });

  it("adds a block, edits it through markup, and reflects it in the preview", () => {
    const { hidden } = renderEditor([]);
    fireEvent.click(screen.getByRole("button", { name: t("admin.blocks.paragraph") }));
    // The label also wraps the markup hint, so match on the leading text only.
    const textarea = screen.getByLabelText(t("admin.editor.paragraph.text"), { exact: false });
    fireEvent.change(textarea, { target: { value: "hello **bold**" } });

    const [block] = hidden();
    expect(block).toMatchObject({
      type: "paragraph",
      content: [
        { text: "hello ", marks: [] },
        { text: "bold", marks: ["bold"] },
      ],
    });
    const preview = screen.getByRole("complementary", { name: t("admin.editor.preview") });
    expect(within(preview).getByText("bold").tagName).toBe("STRONG");
  });

  it("moves and removes blocks", () => {
    const { hidden } = renderEditor();
    const [moveDown] = screen.getAllByRole("button", { name: t("admin.editor.moveDown") });
    if (!moveDown) throw new Error("button missing");
    fireEvent.click(moveDown);
    expect(hidden().map((block) => block.id)).toEqual(["p1", "h1"]);

    const [removeFirst] = screen.getAllByRole("button", { name: t("admin.editor.remove") });
    if (!removeFirst) throw new Error("button missing");
    fireEvent.click(removeFirst);
    expect(hidden().map((block) => block.id)).toEqual(["h1"]);
  });

  it("blocks saving while an image has no uploaded asset", () => {
    renderEditor([]);
    fireEvent.click(screen.getByRole("button", { name: t("admin.blocks.image") }));
    expect(screen.getByRole("button", { name: t("admin.editor.saveDraft") })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(t("admin.editor.incompleteImage"));
    expect(blocksAreComplete([{ id: "i", type: "image", assetId: 0, alt: "" }])).toBe(false);
    expect(blocksAreComplete([{ id: "i", type: "image", assetId: 3, alt: "x" }])).toBe(true);
  });
});
