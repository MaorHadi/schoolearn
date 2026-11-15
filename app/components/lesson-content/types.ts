import type { BlockOf, ContentBlockType } from "~/schemas/content-blocks";
import type { TextDirection } from "~/shared/direction";

export interface BlockProps<T extends ContentBlockType> {
  block: BlockOf<T>;
  /** Resolved direction for this block (subject direction unless overridden). */
  direction: TextDirection;
  /** `dir` attribute to emit: set only when the block overrides the subject direction. */
  dirAttr: TextDirection | undefined;
  /** assetId -> public URL, resolved by the loader. */
  assetUrls: Record<number, string>;
}
