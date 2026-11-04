import {
  ArrowDown,
  ArrowUp,
  Heading as HeadingIcon,
  Image as ImageIcon,
  List as ListIcon,
  Pilcrow,
  Quote as QuoteIcon,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Form, useFetcher, useNavigation } from "react-router";
import { LessonContent } from "~/components/lesson-content/LessonContent";
import { t } from "~/i18n";
import type { ContentBlock, ContentBlockType } from "~/schemas/content-blocks";
import {
  parseInlineMarkup,
  quoteFromMarkup,
  quoteToMarkup,
  serializeInlineMarkup,
} from "~/shared/inline-markup";
import type { TextDirection } from "~/shared/direction";

/** What the lesson route's "upload" intent answers with. */
export type UploadFetcherResult =
  | { ok: true; blockId: string; assetId: number; url: string }
  | { ok: false; blockId: string; reason: "TOO_LARGE" | "UNSUPPORTED_TYPE" | "EMPTY" };

export const SAVE_DRAFT_INTENT = "save-draft";
export const UPLOAD_INTENT = "upload";

type BlockOf<T extends ContentBlockType> = Extract<ContentBlock, { type: T }>;

function newId(): string {
  return crypto.randomUUID();
}

function emptyBlock(type: ContentBlockType): ContentBlock {
  const id = newId();
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

const BLOCK_ICONS: Record<ContentBlockType, ReactNode> = {
  heading: <HeadingIcon size={16} aria-hidden="true" />,
  paragraph: <Pilcrow size={16} aria-hidden="true" />,
  quote: <QuoteIcon size={16} aria-hidden="true" />,
  image: <ImageIcon size={16} aria-hidden="true" />,
  list: <ListIcon size={16} aria-hidden="true" />,
};

const BLOCK_TYPES: ContentBlockType[] = ["heading", "paragraph", "quote", "image", "list"];

/** Blocks with a placeholder image are not saveable; the UI says so before the server does. */
export function blocksAreComplete(blocks: ContentBlock[]): boolean {
  return blocks.every((block) => block.type !== "image" || block.assetId > 0);
}

interface CardProps<T extends ContentBlockType> {
  block: BlockOf<T>;
  direction: TextDirection;
  onChange: (block: BlockOf<T>) => void;
}

function HeadingFields({ block, direction, onChange }: CardProps<"heading">) {
  return (
    <div className="block-card__fields">
      <label className="field">
        <span className="field__label">{t("admin.editor.heading.level")}</span>
        <select
          className="field__input field__input--compact select"
          value={block.level}
          onChange={(event) =>
            onChange({ ...block, level: Number(event.target.value) as 1 | 2 | 3 })
          }
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </label>
      <label className="field">
        <span className="field__label">{t("admin.editor.heading.text")}</span>
        <input
          className="field__input"
          dir={direction}
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
        />
      </label>
    </div>
  );
}

function ParagraphFields({ block, direction, onChange }: CardProps<"paragraph">) {
  return (
    <label className="field">
      <span className="field__label">{t("admin.editor.paragraph.text")}</span>
      <textarea
        className="field__input field__input--multiline"
        dir={direction}
        rows={4}
        value={serializeInlineMarkup(block.content)}
        onChange={(event) => onChange({ ...block, content: parseInlineMarkup(event.target.value) })}
      />
      <span className="field__hint">{t("admin.editor.markupHint")}</span>
    </label>
  );
}

function QuoteFields({ block, direction, onChange }: CardProps<"quote">) {
  return (
    <div className="block-card__fields">
      <label className="field">
        <span className="field__label">{t("admin.editor.quote.text")}</span>
        <textarea
          className="field__input field__input--multiline"
          dir={direction}
          rows={3}
          value={quoteToMarkup(block)}
          onChange={(event) => onChange({ ...block, ...quoteFromMarkup(event.target.value) })}
        />
        <span className="field__hint">{t("admin.editor.quote.hint")}</span>
      </label>
      <div className="admin-form__row">
        <label className="field">
          <span className="field__label">{t("admin.editor.quote.reference")}</span>
          <input
            className="field__input field__input--compact"
            dir={direction}
            value={block.reference ?? ""}
            onChange={(event) => onChange({ ...block, reference: event.target.value || undefined })}
          />
        </label>
        <label className="field">
          <span className="field__label">{t("admin.editor.quote.sourceLabel")}</span>
          <input
            className="field__input field__input--compact"
            dir={direction}
            value={block.sourceLabel ?? ""}
            onChange={(event) =>
              onChange({ ...block, sourceLabel: event.target.value || undefined })
            }
          />
        </label>
      </div>
    </div>
  );
}

function ListFields({ block, direction, onChange }: CardProps<"list">) {
  return (
    <div className="block-card__fields">
      <label className="field field--inline">
        <input
          type="checkbox"
          checked={block.ordered}
          onChange={(event) => onChange({ ...block, ordered: event.target.checked })}
        />
        <span className="field__label">{t("admin.editor.list.ordered")}</span>
      </label>
      <label className="field">
        <span className="field__label">{t("admin.editor.list.items")}</span>
        <textarea
          className="field__input field__input--multiline"
          dir={direction}
          rows={4}
          value={block.items.map(serializeInlineMarkup).join("\n")}
          onChange={(event) =>
            onChange({
              ...block,
              items: event.target.value
                .split("\n")
                .filter((line) => line.length > 0)
                .map(parseInlineMarkup),
            })
          }
        />
        <span className="field__hint">{t("admin.editor.list.hint")}</span>
      </label>
    </div>
  );
}

function ImageFields({
  block,
  direction,
  onChange,
  assetUrl,
  onUploaded,
}: CardProps<"image"> & {
  assetUrl: string | undefined;
  onUploaded: (assetId: number, url: string) => void;
}) {
  const fetcher = useFetcher<UploadFetcherResult>();
  const result = fetcher.data;
  const uploading = fetcher.state !== "idle";

  // Adopt the upload result once it arrives; the fetcher only ever carries this block's upload.
  useEffect(() => {
    if (result?.ok && result.blockId === block.id && result.assetId !== block.assetId) {
      onUploaded(result.assetId, result.url);
    }
  }, [result, block.id, block.assetId, onUploaded]);

  return (
    <div className="block-card__fields">
      {assetUrl ? (
        <img src={assetUrl} alt="" className="block-card__thumb" />
      ) : (
        <p className="muted">{t("admin.editor.image.none")}</p>
      )}
      <fetcher.Form method="post" encType="multipart/form-data" className="block-card__upload">
        <input type="hidden" name="intent" value={UPLOAD_INTENT} />
        <input type="hidden" name="blockId" value={block.id} />
        <label className="field">
          <span className="field__label">{t("admin.editor.image.file")}</span>
          <input
            className="field__input field__input--compact"
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            required
          />
        </label>
        <button type="submit" className="btn btn--ghost btn--small" disabled={uploading}>
          <Upload size={16} aria-hidden="true" />
          {uploading ? t("admin.editor.image.uploading") : t("admin.editor.image.upload")}
        </button>
        {result && !result.ok && result.blockId === block.id ? (
          <span className="field__error" role="alert">
            {t(`admin.error.upload.${result.reason}`)}
          </span>
        ) : null}
      </fetcher.Form>
      <label className="field">
        <span className="field__label">{t("admin.editor.image.alt")}</span>
        <input
          className="field__input field__input--compact"
          dir={direction}
          value={block.alt}
          onChange={(event) => onChange({ ...block, alt: event.target.value })}
          required
        />
      </label>
      <label className="field">
        <span className="field__label">{t("admin.editor.image.caption")}</span>
        <input
          className="field__input field__input--compact"
          dir={direction}
          value={block.caption ?? ""}
          onChange={(event) => onChange({ ...block, caption: event.target.value || undefined })}
        />
      </label>
    </div>
  );
}

function BlockCard({
  block,
  index,
  total,
  direction,
  assetUrls,
  onChange,
  onMove,
  onRemove,
  onUploaded,
}: {
  block: ContentBlock;
  index: number;
  total: number;
  direction: TextDirection;
  assetUrls: Record<number, string>;
  onChange: (block: ContentBlock) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
  onUploaded: (assetId: number, url: string) => void;
}) {
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
    <li className="block-card" data-block-type={block.type}>
      <div className="block-card__toolbar">
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
            className="icon-btn"
            aria-label={t("admin.editor.moveUp")}
            title={t("admin.editor.moveUp")}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={t("admin.editor.moveDown")}
            title={t("admin.editor.moveDown")}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={16} aria-hidden="true" />
          </button>
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

export interface BlockEditorProps {
  initialBlocks: ContentBlock[];
  direction: TextDirection;
  initialAssetUrls: Record<number, string>;
}

/**
 * Form-per-block editor with a live preview. The block array lives in React state and is
 * posted as one JSON field (`blocks`) with intent "save-draft"; the route validates it with
 * BlocksFormSchema. Image uploads go through a per-card fetcher with intent "upload".
 */
export function BlockEditor({ initialBlocks, direction, initialAssetUrls }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks);
  const [assetUrls, setAssetUrls] = useState<Record<number, string>>(initialAssetUrls);
  const navigation = useNavigation();
  const saving =
    navigation.state !== "idle" && navigation.formData?.get("intent") === SAVE_DRAFT_INTENT;
  const complete = blocksAreComplete(blocks);

  const replaceAt = (index: number, block: ContentBlock) =>
    setBlocks((current) => current.map((entry, position) => (position === index ? block : entry)));
  const moveAt = (index: number, offset: -1 | 1) =>
    setBlocks((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const moving = next[index];
      const other = next[target];
      if (!moving || !other) return current;
      next[index] = other;
      next[target] = moving;
      return next;
    });
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
              index={index}
              total={blocks.length}
              direction={direction}
              assetUrls={assetUrls}
              onChange={(next) => replaceAt(index, next)}
              onMove={(offset) => moveAt(index, offset)}
              onRemove={() => removeAt(index)}
              onUploaded={uploadedFor(block.id)}
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
