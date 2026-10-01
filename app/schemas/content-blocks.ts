// Shared (client-safe): lesson content block schemas. No server imports here.
//
// Lesson.content is a JSON array of these blocks, validated on every read and write
// (see lesson-content.server.ts). Blocks are subject-agnostic by design: a "quote" is a
// scripture verse, a historical source, a poem, or a legal clause depending only on its data.
//
// To add a block type:
//   1. define its schema below and add it to the ContentBlock union
//   2. add a renderer in app/components/lesson-content/blocks/
//   3. register it in app/components/lesson-content/LessonContent.tsx (compile error until done)
// No migration is needed; existing lessons stay valid because the union only grew.
import { z } from "zod";

export const Direction = z.enum(["rtl", "ltr"]);

export const InlineMark = z.enum(["bold", "italic", "highlight"]);
export const InlineSpan = z.object({ text: z.string(), marks: z.array(InlineMark).default([]) });
export const RichText = z.array(InlineSpan);

const Base = z.object({
  id: z.string().min(1),
  /** Per-block direction override. Omit to inherit the subject's direction. */
  dir: Direction.optional(),
});

export const HeadingBlock = Base.extend({
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string(),
});

export const ParagraphBlock = Base.extend({
  type: z.literal("paragraph"),
  content: RichText,
});

const HighlightRange = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
});

export const QuoteBlock = Base.extend({
  type: z.literal("quote"),
  text: z.string(),
  /** e.g. a chapter/verse reference, "Magna Carta s.39", "Frost, 1916" */
  reference: z.string().optional(),
  /** e.g. "Verse", "Primary source", "Poem" */
  sourceLabel: z.string().optional(),
  highlights: z.array(HighlightRange).default([]),
}).check((context) => {
  const quote = context.value;
  quote.highlights.forEach((highlight, index) => {
    if (highlight.start > highlight.end) {
      context.issues.push({
        code: "custom",
        message: "highlight start must be <= end",
        path: ["highlights", index],
        input: highlight,
      });
    }
    if (highlight.end > quote.text.length) {
      context.issues.push({
        code: "custom",
        message: "highlight range exceeds text length",
        path: ["highlights", index],
        input: highlight,
      });
    }
  });
});

export const ImageBlock = Base.extend({
  type: z.literal("image"),
  assetId: z.number().int().positive(),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

export const ListBlock = Base.extend({
  type: z.literal("list"),
  ordered: z.boolean(),
  items: z.array(RichText),
});

export const ContentBlock = z.discriminatedUnion("type", [
  HeadingBlock,
  ParagraphBlock,
  QuoteBlock,
  ImageBlock,
  ListBlock,
]);

export const LessonContent = z.array(ContentBlock);

export type InlineSpan = z.infer<typeof InlineSpan>;
export type RichText = z.infer<typeof RichText>;
export type ContentBlock = z.infer<typeof ContentBlock>;
export type ContentBlockType = ContentBlock["type"];
export type LessonContent = z.infer<typeof LessonContent>;
