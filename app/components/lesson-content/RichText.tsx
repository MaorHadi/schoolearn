import type { ReactNode } from "react";
import type { RichText as RichTextT } from "~/schemas/content-blocks";

/** Renders inline spans with bold / italic / highlight marks. */
export function RichText({ content }: { content: RichTextT }) {
  return (
    <>
      {content.map((span, index) => {
        let node: ReactNode = span.text;
        if (span.marks.includes("bold")) node = <strong>{node}</strong>;
        if (span.marks.includes("italic")) node = <em>{node}</em>;
        if (span.marks.includes("highlight")) node = <mark>{node}</mark>;
        return <span key={index}>{node}</span>;
      })}
    </>
  );
}
