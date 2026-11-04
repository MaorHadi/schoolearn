// Shared (client-safe). A tiny plain-text markup so the editor can edit rich text in a textarea:
//   **bold**   *italic*   ==highlight==   and a backslash escapes the next character.
// Marks toggle, so "**a *b* c**" is bold a, bold+italic b, bold c. Pure functions, no DOM.
import type { InlineSpan, RichText } from "~/schemas/content-blocks";

type Mark = InlineSpan["marks"][number];

/** Canonical mark order so equal spans compare equal after a round trip. */
const MARK_ORDER: Mark[] = ["bold", "italic", "highlight"];

const MARKERS: { token: string; mark: Mark }[] = [
  { token: "**", mark: "bold" },
  { token: "==", mark: "highlight" },
  { token: "*", mark: "italic" },
];

function sortedMarks(active: Set<Mark>): Mark[] {
  return MARK_ORDER.filter((mark) => active.has(mark));
}

/** Markup string -> spans. Empty text yields an empty array. */
export function parseInlineMarkup(markup: string): RichText {
  const spans: InlineSpan[] = [];
  const active = new Set<Mark>();
  let buffer = "";
  const flush = () => {
    if (buffer.length > 0) spans.push({ text: buffer, marks: sortedMarks(active) });
    buffer = "";
  };

  let index = 0;
  while (index < markup.length) {
    const character = markup[index] ?? "";
    if (character === "\\" && index + 1 < markup.length) {
      buffer += markup[index + 1];
      index += 2;
      continue;
    }
    const marker = MARKERS.find((entry) => markup.startsWith(entry.token, index));
    if (marker) {
      flush();
      if (active.has(marker.mark)) active.delete(marker.mark);
      else active.add(marker.mark);
      index += marker.token.length;
      continue;
    }
    buffer += character;
    index += 1;
  }
  flush();
  return spans;
}

function escapeText(text: string): string {
  return text.replace(/([\\*=])/g, "\\$1");
}

/** Spans -> markup string. Marks are opened/closed only where they change between spans. */
export function serializeInlineMarkup(spans: RichText): string {
  let output = "";
  let active = new Set<Mark>();
  for (const span of spans) {
    const next = new Set<Mark>(span.marks);
    // Close marks no longer active (innermost first), then open newly active ones.
    for (const mark of [...MARK_ORDER].reverse()) {
      if (active.has(mark) && !next.has(mark)) output += tokenFor(mark);
    }
    for (const mark of MARK_ORDER) {
      if (!active.has(mark) && next.has(mark)) output += tokenFor(mark);
    }
    output += escapeText(span.text);
    active = next;
  }
  for (const mark of [...MARK_ORDER].reverse()) {
    if (active.has(mark)) output += tokenFor(mark);
  }
  return output;
}

function tokenFor(mark: Mark): string {
  const marker = MARKERS.find((entry) => entry.mark === mark);
  if (!marker) throw new Error(`Unknown mark ${mark}`);
  return marker.token;
}

export interface QuoteText {
  text: string;
  highlights: { start: number; end: number }[];
}

/** Quote text with `==…==` around each highlight range (ranges are sorted and non-overlapping). */
export function quoteToMarkup(quote: QuoteText): string {
  const ranges = [...quote.highlights].sort((left, right) => left.start - right.start);
  let output = "";
  let cursor = 0;
  for (const range of ranges) {
    const start = Math.max(range.start, cursor);
    const end = Math.max(range.end, start);
    output += escapeQuote(quote.text.slice(cursor, start));
    output += "==" + escapeQuote(quote.text.slice(start, end)) + "==";
    cursor = end;
  }
  return output + escapeQuote(quote.text.slice(cursor));
}

function escapeQuote(text: string): string {
  return text.replace(/([\\=])/g, "\\$1");
}

/** Inverse of quoteToMarkup: strips `==` markers into highlight offsets on the plain text. */
export function quoteFromMarkup(markup: string): QuoteText {
  let text = "";
  const highlights: { start: number; end: number }[] = [];
  let openAt: number | null = null;
  let index = 0;
  while (index < markup.length) {
    const character = markup[index] ?? "";
    if (character === "\\" && index + 1 < markup.length) {
      text += markup[index + 1];
      index += 2;
      continue;
    }
    if (markup.startsWith("==", index)) {
      if (openAt === null) openAt = text.length;
      else {
        if (text.length > openAt) highlights.push({ start: openAt, end: text.length });
        openAt = null;
      }
      index += 2;
      continue;
    }
    text += character;
    index += 1;
  }
  if (openAt !== null && text.length > openAt) highlights.push({ start: openAt, end: text.length });
  return { text, highlights };
}
