import { Trash2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Field } from "~/components/forms/Field";
import { IconButton } from "~/components/IconButton";
import { t } from "~/i18n";
import type { ContentBlock } from "~/schemas/content-blocks";
import type { TextDirection } from "~/shared/direction";
import type { MoveDirection } from "~/shared/ordering";
import { BLOCK_ICONS } from "./blocks";
import { DragHandle } from "./DragHandle";
import { HeadingFields } from "./fields/HeadingFields";
import { ImageFields } from "./fields/ImageFields";
import { ListFields } from "./fields/ListFields";
import { ParagraphFields } from "./fields/ParagraphFields";
import { QuoteFields } from "./fields/QuoteFields";

interface BlockCardProps {
  block: ContentBlock;
  direction: TextDirection;
  assetUrls: Record<number, string>;
  onChange: (block: ContentBlock) => void;
  onMove: (direction: MoveDirection) => void;
  onRemove: () => void;
  onUploaded: (assetId: number, url: string) => void;
  /** From useDragOrder: `targetProps` for the card, `handleProps` for its grip. */
  rowProps: ComponentProps<"li">;
  handleProps: ComponentProps<"button">;
}

/** One block: toolbar (drag handle, type, direction override, remove) and the type's fields. */
export function BlockCard({
  block,
  direction,
  assetUrls,
  onChange,
  onMove,
  onRemove,
  onUploaded,
  rowProps,
  handleProps,
}: BlockCardProps) {
  const fieldDirection = block.dir ?? direction;

  let fields: ReactNode;
  switch (block.type) {
    case "heading":
      fields = <HeadingFields block={block} direction={fieldDirection} onChange={onChange} />;
      break;
    case "paragraph":
      fields = <ParagraphFields block={block} direction={fieldDirection} onChange={onChange} />;
      break;
    case "quote":
      fields = <QuoteFields block={block} direction={fieldDirection} onChange={onChange} />;
      break;
    case "list":
      fields = <ListFields block={block} direction={fieldDirection} onChange={onChange} />;
      break;
    case "image":
      fields = (
        <ImageFields
          block={block}
          direction={fieldDirection}
          onChange={onChange}
          assetUrl={assetUrls[block.assetId]}
          onUploaded={onUploaded}
        />
      );
      break;
  }

  return (
    <li className="block-card" data-block-type={block.type} {...rowProps}>
      <div className="block-card__toolbar">
        <DragHandle label={t("admin.editor.drag")} onMove={onMove} {...handleProps} />
        <span className="block-card__type">
          {BLOCK_ICONS[block.type]}
          {t(`admin.blocks.${block.type}`)}
        </span>
        <Field label={t("admin.editor.dir")} hideLabel className="block-card__dir">
          <select
            className="field__input field__input--compact select"
            value={block.dir ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              const { dir: _dir, ...rest } = block;
              onChange(value === "" ? rest : { ...rest, dir: value as TextDirection });
            }}
          >
            <option value="">{t("admin.editor.dir.inherit")}</option>
            <option value="rtl">{t("admin.subject.form.direction.rtl")}</option>
            <option value="ltr">{t("admin.subject.form.direction.ltr")}</option>
          </select>
        </Field>
        <span className="tree-actions">
          <IconButton
            label={t("admin.editor.remove")}
            icon={<Trash2 size={16} aria-hidden="true" />}
            danger
            onClick={onRemove}
          />
        </span>
      </div>
      {fields}
    </li>
  );
}
