import { GripVertical, Trash2 } from "lucide-react";
import type { DragEvent, KeyboardEvent, ReactNode } from "react";
import { t } from "~/i18n";
import type { ContentBlock } from "~/schemas/content-blocks";
import type { TextDirection } from "~/shared/direction";
import { BLOCK_ICONS } from "./blocks";
import { HeadingFields } from "./fields/HeadingFields";
import { ImageFields } from "./fields/ImageFields";
import { ListFields } from "./fields/ListFields";
import { ParagraphFields } from "./fields/ParagraphFields";
import { QuoteFields } from "./fields/QuoteFields";
import type { DragState } from "./useBlockDragOrder";

export interface BlockCardProps {
  block: ContentBlock;
  direction: TextDirection;
  assetUrls: Record<number, string>;
  dragState: DragState;
  onChange: (block: ContentBlock) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
  onUploaded: (assetId: number, url: string) => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

/** One block: toolbar (drag handle, type, direction override, remove) and the type's fields. */
export function BlockCard({
  block,
  direction,
  assetUrls,
  dragState,
  onChange,
  onMove,
  onRemove,
  onUploaded,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
}: BlockCardProps) {
  const fieldDirection = block.dir ?? direction;
  // The handle is the only draggable part so text selection inside the fields keeps working.
  const startDrag = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer?.setData("text/plain", block.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    onDragStart();
  };
  const allowDrop = (event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  };
  const handleKeys = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onMove(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onMove(1);
    }
  };

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
    <li
      className="block-card"
      data-block-type={block.type}
      data-drag={dragState ?? undefined}
      onDragEnter={onDragEnter}
      onDragOver={allowDrop}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <div className="block-card__toolbar">
        <button
          type="button"
          className="icon-btn block-card__handle"
          draggable
          aria-label={t("admin.editor.drag")}
          title={t("admin.editor.drag")}
          onDragStart={startDrag}
          onDragEnd={onDragEnd}
          onKeyDown={handleKeys}
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
        <span className="block-card__type">
          {BLOCK_ICONS[block.type]}
          {t(`admin.blocks.${block.type}`)}
        </span>
        <label className="block-card__dir">
          <span className="visually-hidden">{t("admin.editor.dir")}</span>
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
        </label>
        <span className="tree-actions">
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            aria-label={t("admin.editor.remove")}
            title={t("admin.editor.remove")}
            onClick={onRemove}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </span>
      </div>
      {fields}
    </li>
  );
}
