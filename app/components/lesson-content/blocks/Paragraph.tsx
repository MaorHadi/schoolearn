import { RichText } from "../RichText";
import type { BlockProps } from "../types";

export function Paragraph({ block, dirAttr }: BlockProps<"paragraph">) {
  return (
    <p dir={dirAttr} className="block block-paragraph">
      <RichText content={block.content} />
    </p>
  );
}
