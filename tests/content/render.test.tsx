// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);
import { LessonContent } from "~/components/lesson-content/LessonContent";
import type { LessonContent as Blocks } from "~/schemas/content-blocks";

const blocks: Blocks = [
  { id: "h", type: "heading", level: 2, text: "Title" },
  {
    id: "p",
    type: "paragraph",
    content: [
      { text: "plain ", marks: [] },
      { text: "bold", marks: ["bold"] },
      { text: " em", marks: ["italic"] },
      { text: " hi", marks: ["highlight"] },
    ],
  },
  {
    id: "q",
    type: "quote",
    text: "hello world",
    reference: "Ref",
    sourceLabel: "Src",
    highlights: [{ start: 6, end: 11 }],
  },
  { id: "i", type: "image", assetId: 7, alt: "An image", caption: "Cap" },
  {
    id: "l",
    type: "list",
    ordered: false,
    items: [[{ text: "one", marks: [] }], [{ text: "two", marks: [] }]],
  },
  { id: "o", type: "paragraph", dir: "ltr", content: [{ text: "override", marks: [] }] },
];

describe("LessonContent", () => {
  it("renders every block type with the subject direction", () => {
    const { container } = render(
      <LessonContent blocks={blocks} direction="rtl" assetUrls={{ 7: "/assets/x.png" }} />,
    );
    expect(container.firstElementChild?.getAttribute("dir")).toBe("rtl");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Title");
    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("em")).toHaveTextContent("em");
    expect(container.querySelector("p mark")).toHaveTextContent("hi");

    const quote = container.querySelector("blockquote");
    expect(quote).not.toBeNull();
    expect(quote?.querySelector("mark")).toHaveTextContent("world");
    expect(quote).toHaveTextContent("Ref");
    expect(quote).toHaveTextContent("Src");

    expect(screen.getByAltText("An image").getAttribute("src")).toBe("/assets/x.png");
    expect(screen.getByText("Cap")).toBeTruthy();
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
  });

  it("emits dir only on blocks that override the subject direction", () => {
    const { container } = render(<LessonContent blocks={blocks} direction="rtl" assetUrls={{}} />);
    const paragraphs = Array.from(container.querySelectorAll("p.block-paragraph"));
    const normal = paragraphs.find((paragraph) => paragraph.textContent?.startsWith("plain"));
    const override = paragraphs.find((paragraph) => paragraph.textContent === "override");
    expect(normal?.getAttribute("dir")).toBeNull();
    expect(override?.getAttribute("dir")).toBe("ltr");
  });

  it("renders an ordered list as <ol>", () => {
    const { container } = render(
      <LessonContent
        blocks={[{ id: "l", type: "list", ordered: true, items: [[{ text: "a", marks: [] }]] }]}
        direction="ltr"
        assetUrls={{}}
      />,
    );
    expect(container.querySelectorAll("ol li")).toHaveLength(1);
  });

  it("renders a labelled fallback for an image whose asset URL is missing", () => {
    const { container } = render(
      <LessonContent blocks={[blocks[3] as Blocks[number]]} direction="ltr" assetUrls={{}} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("An image")).toBeTruthy();
  });

  it("renders quote highlights that are unsorted or adjacent without dropping text", () => {
    const { container } = render(
      <LessonContent
        blocks={[
          {
            id: "q",
            type: "quote",
            text: "abcdef",
            highlights: [
              { start: 4, end: 6 },
              { start: 0, end: 2 },
            ],
          },
        ]}
        direction="ltr"
        assetUrls={{}}
      />,
    );
    const quoteText = container.querySelector("blockquote p");
    expect(quoteText?.textContent).toBe("abcdef");
    expect(quoteText?.querySelectorAll("mark")).toHaveLength(2);
  });
});
