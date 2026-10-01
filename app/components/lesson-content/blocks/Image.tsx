import type { BlockProps } from "../types";

export function Image({ block, dirAttr, assetUrls }: BlockProps<"image">) {
  const src = assetUrls[block.assetId];
  return (
    <figure dir={dirAttr} className="block block-image">
      {src ? (
        <img src={src} alt={block.alt} loading="lazy" />
      ) : (
        <div className="image-missing" role="img" aria-label={block.alt}>
          {block.alt}
        </div>
      )}
      {block.caption ? <figcaption>{block.caption}</figcaption> : null}
    </figure>
  );
}
