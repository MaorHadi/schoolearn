import { RichText } from "../RichText";
import type { BlockProps } from "../types";

export function List({ block, dirAttr }: BlockProps<"list">) {
  const Tag = block.ordered ? "ol" : "ul";
  return (
    <Tag dir={dirAttr} className="block block-list">
      {block.items.map((item, index) => (
        <li key={index}>
          <RichText content={item} />
        </li>
      ))}
    </Tag>
  );
}
