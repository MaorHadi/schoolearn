import type { BlockProps } from "../types";

export function Heading({ block, dirAttr }: BlockProps<"heading">) {
  const Tag = `h${block.level}` as const;
  return (
    <Tag dir={dirAttr} className="block block-heading">
      {block.text}
    </Tag>
  );
}
