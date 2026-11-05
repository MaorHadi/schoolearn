// Shared vocabulary of the block editor: intents, the upload fetcher contract, block factories
// and the icon per block type. Field components and the editor itself import from here.
import {
  Heading as HeadingIcon,
  Image as ImageIcon,
  List as ListIcon,
  Pilcrow,
  Quote as QuoteIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ContentBlock, ContentBlockType } from "~/schemas/content-blocks";
import type { TextDirection } from "~/shared/direction";

export const SAVE_DRAFT_INTENT = "save-draft";
export const UPLOAD_INTENT = "upload";

/** What the lesson route's "upload" intent answers with. */
export type UploadFetcherResult =
  | { ok: true; blockId: string; assetId: number; url: string }
  | { ok: false; blockId: string; reason: "TOO_LARGE" | "UNSUPPORTED_TYPE" | "EMPTY" };

export type BlockOf<T extends ContentBlockType> = Extract<ContentBlock, { type: T }>;

/** Props every per-type field component receives. */
export interface FieldsProps<T extends ContentBlockType> {
  block: BlockOf<T>;
  direction: TextDirection;
  onChange: (block: BlockOf<T>) => void;
}

export const BLOCK_TYPES: ContentBlockType[] = ["heading", "paragraph", "quote", "image", "list"];

export const BLOCK_ICONS: Record<ContentBlockType, ReactNode> = {
  heading: <HeadingIcon size={16} aria-hidden="true" />,
  paragraph: <Pilcrow size={16} aria-hidden="true" />,
  quote: <QuoteIcon size={16} aria-hidden="true" />,
  image: <ImageIcon size={16} aria-hidden="true" />,
  list: <ListIcon size={16} aria-hidden="true" />,
};

export function emptyBlock(type: ContentBlockType): ContentBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "heading":
      return { id, type, level: 2, text: "" };
    case "paragraph":
      return { id, type, content: [] };
    case "quote":
      return { id, type, text: "", highlights: [] };
    case "image":
      // assetId 0 is a placeholder until an upload succeeds; the schema rejects it on save.
      return { id, type, assetId: 0, alt: "" };
    case "list":
      return { id, type, ordered: false, items: [] };
  }
}

/** Image blocks need an upload and alt text to pass the schema; the UI says so before the server does. */
export function blocksAreComplete(blocks: ContentBlock[]): boolean {
  return blocks.every(
    (block) => block.type !== "image" || (block.assetId > 0 && block.alt.trim().length > 0),
  );
}
