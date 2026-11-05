import { Save } from "lucide-react";
import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { LessonContent } from "~/components/lesson-content/LessonContent";
import { t, type TranslationKey } from "~/i18n";
import type { ContentBlock, ContentBlockType } from "~/schemas/content-blocks";
import type { TextDirection } from "~/shared/direction";
import { BlockCard } from "./BlockCard";
import {
  BLOCK_ICONS,
  BLOCK_TYPES,
  blocksAreComplete,
  emptyBlock,
  SAVE_DRAFT_INTENT,
} from "./blocks";
import { useBlockDragOrder } from "./useBlockDragOrder";

export {
  blocksAreComplete,
  SAVE_DRAFT_INTENT,
  UPLOAD_INTENT,
  type UploadFetcherResult,
} from "./blocks";

export interface BlockEditorProps {
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
  const order = useBlockDragOrder(setBlocks);
  const navigation = useNavigation();
  const saving =
    navigation.state !== "idle" && navigation.formData?.get("intent") === SAVE_DRAFT_INTENT;
  const complete = blocksAreComplete(blocks);

  const replaceAt = (index: number, block: ContentBlock) =>
    setBlocks((current) => current.map((entry, position) => (position === index ? block : entry)));
  const removeAt = (index: number) =>
    setBlocks((current) => current.filter((_entry, position) => position !== index));
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
        <ol className="block-list">
          {blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              direction={direction}
              assetUrls={assetUrls}
              dragState={order.dragStateOf(block.id)}
              onChange={(next) => replaceAt(index, next)}
              onMove={(offset) => order.moveAt(index, offset)}
              onRemove={() => removeAt(index)}
              onUploaded={uploadedFor(block.id)}
              onDragStart={() => order.startDrag(block.id)}
              onDragEnter={() => order.enterTarget(block.id)}
              onDrop={() => order.dropOn(block.id)}
              onDragEnd={order.endDrag}
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

        {!complete ? (
          <p className="alert" role="alert">
            {t("admin.editor.incompleteImage")}
          </p>
        ) : null}
        {formError ? (
          <p className="alert" role="alert">
            {t(formError)}
          </p>
        ) : null}
        <button type="submit" className="btn btn--primary" disabled={saving || !complete}>
          <Save size={18} aria-hidden="true" />
          {saving ? t("admin.editor.saving") : t("admin.editor.saveDraft")}
        </button>
      </Form>

      <aside className="editor__preview" aria-label={t("admin.editor.preview")}>
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
