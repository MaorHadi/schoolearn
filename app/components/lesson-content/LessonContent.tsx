import type { FC } from "react";
import type {
  ContentBlock,
  ContentBlockType,
  LessonContent as Blocks,
} from "~/schemas/content-blocks";
import { resolveDirection, type TextDirection } from "~/shared/direction";
import type { BlockProps } from "./types";
import { Heading } from "./blocks/Heading";
import { Paragraph } from "./blocks/Paragraph";
import { Quote } from "./blocks/Quote";
import { Image } from "./blocks/Image";
import { List } from "./blocks/List";

/**
 * Renderer registry. Exhaustive over the ContentBlock union: adding a block type in
 * app/schemas/content-blocks.ts without a renderer here is a compile error.
 */
const RENDERERS: { [T in ContentBlockType]: FC<BlockProps<T>> } = {
  heading: Heading,
  paragraph: Paragraph,
  quote: Quote,
  image: Image,
  list: List,
};

function renderBlock(
  block: ContentBlock,
  subjectDir: TextDirection,
  assetUrls: Record<number, string>,
) {
  const direction = resolveDirection(subjectDir, block.dir);
  const dirAttr = block.dir ? direction : undefined;
  // Safe: RENDERERS is keyed by the same discriminant as `block.type`.
  const Renderer = RENDERERS[block.type] as FC<BlockProps<ContentBlockType>>;
  return (
    <Renderer
      key={block.id}
      block={block}
      direction={direction}
      dirAttr={dirAttr}
      assetUrls={assetUrls}
    />
  );
}

interface LessonContentProps {
  blocks: Blocks;
  /** The subject's content direction. */
  direction: TextDirection;
  /** assetId -> public URL, resolved in the route loader. */
  assetUrls: Record<number, string>;
}

export function LessonContent({ blocks, direction, assetUrls }: LessonContentProps) {
  return (
    <div dir={direction} className="lesson-content">
      {blocks.map((block) => renderBlock(block, direction, assetUrls))}
    </div>
  );
}
