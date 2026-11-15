import { useState } from "react";
import { Form } from "react-router";
import { LessonContent } from "~/components/lesson-content/LessonContent";
import { t, type TranslationKey } from "~/i18n";
import type { ContentBlock, ContentBlockType } from "~/schemas/content-blocks";
import type { TextDirection } from "~/shared/direction";
import { moveToPositionOf, swapWithNeighbour } from "~/shared/ordering";
import { BlockCard } from "./BlockCard";
import {
  BLOCK_ICONS,
  BLOCK_TYPES,
  blocksAreComplete,
  emptyBlock,
  SAVE_DRAFT_INTENT,
} from "./blocks";
import { DraftSaveFooter } from "./DraftSaveFooter";
import { useDragOrder } from "./useDragOrder";

interface BlockEditorProps {
  initialBlocks: ContentBlock[];
  direction: TextDirection;
  initialAssetUrls: Record<number, string>;
  /** Server-side validation message for the last save attempt, if it failed. */
  formError?: TranslationKey;
}

/**
 * Form-per-block editor with a live preview. The block array lives in React state and is
 * posted as one JSON field (`blocks`) with intent "save-draft"; the route validates it with
 * BlocksFormSchema. Image uploads go through a per-card fetcher with intent "upload".
 */
export function BlockEditor({
  initialBlocks,
  direction,
  initialAssetUrls,
  formError,
}: BlockEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks);
  const [assetUrls, setAssetUrls] = useState<Record<number, string>>(initialAssetUrls);
  const drag = useDragOrder<string>((sourceId, targetId) =>
    setBlocks((current) => moveToPositionOf(current, sourceId, targetId) ?? current),
  );

  const replace = (block: ContentBlock) =>
    setBlocks((current) => current.map((entry) => (entry.id === block.id ? block : entry)));
  const remove = (blockId: string) =>
    setBlocks((current) => current.filter((entry) => entry.id !== blockId));
  const add = (type: ContentBlockType) => setBlocks((current) => [...current, emptyBlock(type)]);
  const uploadedFor = (blockId: string) => (assetId: number, url: string) => {
    setAssetUrls((current) => ({ ...current, [assetId]: url }));
    setBlocks((current) =>
      current.map((entry) =>
        entry.id === blockId && entry.type === "image" ? { ...entry, assetId } : entry,
      ),
    );
  };

  return (
    <div className="editor">
      <Form method="post" className="editor__form" noValidate>
        <input type="hidden" name="intent" value={SAVE_DRAFT_INTENT} />
        <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />

        {blocks.length === 0 ? <p className="empty">{t("admin.editor.empty")}</p> : null}
        <ol className="editor-list">
          {blocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              direction={direction}
              assetUrls={assetUrls}
              onChange={replace}
              onMove={(moveDirection) =>
                setBlocks(
                  (current) => swapWithNeighbour(current, block.id, moveDirection) ?? current,
                )
              }
              onRemove={() => remove(block.id)}
              onUploaded={uploadedFor(block.id)}
              rowProps={drag.targetProps(block.id)}
              handleProps={drag.handleProps(block.id)}
            />
          ))}
        </ol>

        <div className="editor__add" role="group" aria-label={t("admin.editor.add")}>
          <span className="muted">{t("admin.editor.add")}</span>
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => add(type)}
            >
              {BLOCK_ICONS[type]}
              {t(`admin.blocks.${type}`)}
            </button>
          ))}
        </div>

        <DraftSaveFooter
          intent={SAVE_DRAFT_INTENT}
          complete={blocksAreComplete(blocks)}
          incompleteMessage="admin.editor.incompleteImage"
          formError={formError}
        />
      </Form>

      <aside className="card editor__preview" aria-label={t("admin.editor.preview")}>
        <h2 className="section-title">{t("admin.editor.preview")}</h2>
        <div className="editor__preview-body">
          <LessonContent
            blocks={blocks.filter((block) => block.type !== "image" || block.assetId > 0)}
            direction={direction}
            assetUrls={assetUrls}
          />
        </div>
      </aside>
    </div>
  );
}
