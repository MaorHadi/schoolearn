import type { BlockProps } from "../types";

interface Segment {
  text: string;
  highlighted: boolean;
}

/** Split text into highlighted / plain segments. Ranges are validated by the schema. */
function segments(text: string, highlights: { start: number; end: number }[]): Segment[] {
  const sorted = [...highlights].sort((left, right) => left.start - right.start);
  const result: Segment[] = [];
  let position = 0;
  for (const highlight of sorted) {
    const start = Math.max(highlight.start, position); // tolerate overlaps without duplicating text
    if (start > position) result.push({ text: text.slice(position, start), highlighted: false });
    if (highlight.end > start) {
      result.push({ text: text.slice(start, highlight.end), highlighted: true });
    }
    position = Math.max(position, highlight.end);
  }
  if (position < text.length) result.push({ text: text.slice(position), highlighted: false });
  return result;
}

export function Quote({ block, dirAttr }: BlockProps<"quote">) {
  return (
    <blockquote dir={dirAttr} className="block block-quote">
      {block.sourceLabel ? <span className="quote-label">{block.sourceLabel}</span> : null}
      <p>
        {segments(block.text, block.highlights).map((segment, index) =>
          segment.highlighted ? (
            <mark key={index}>{segment.text}</mark>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </p>
      {block.reference ? <cite className="quote-reference">{block.reference}</cite> : null}
    </blockquote>
  );
}
