import { Upload } from "lucide-react";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { Field } from "~/components/forms/Field";
import { t } from "~/i18n";
import { UPLOAD_INTENT, type FieldsProps, type UploadFetcherResult } from "../blocks";

/** Image card: upload through a per-card fetcher, then alt text and caption. */
export function ImageFields({
  block,
  direction,
  onChange,
  assetUrl,
  onUploaded,
}: FieldsProps<"image"> & {
  assetUrl: string | undefined;
  onUploaded: (assetId: number, url: string) => void;
}) {
  const fetcher = useFetcher<UploadFetcherResult>();
  const result = fetcher.data;
  const uploading = fetcher.state !== "idle";

  // The fetcher only ever carries this block's upload; a rejected-before-parsing result
  // (TOO_LARGE on the declared size) has no block id, so an empty id also means "mine".
  const mine = result !== undefined && (result.blockId === block.id || result.blockId === "");

  // Adopt the upload result once it arrives.
  useEffect(() => {
    if (result?.ok && mine && result.assetId !== block.assetId) {
      onUploaded(result.assetId, result.url);
    }
  }, [result, mine, block.assetId, onUploaded]);

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
        <Field label={t("admin.editor.image.file")}>
          <input
            className="field__input field__input--compact"
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            required
          />
        </Field>
        <button type="submit" className="btn btn--ghost btn--small" disabled={uploading}>
          <Upload size={16} aria-hidden="true" />
          {uploading ? t("admin.editor.image.uploading") : t("admin.editor.image.upload")}
        </button>
        {result && !result.ok && mine ? (
          <span className="field__error" role="alert">
            {t(`admin.error.upload.${result.reason}`)}
          </span>
        ) : null}
      </fetcher.Form>
      <Field label={t("admin.editor.image.alt")}>
        <input
          className="field__input field__input--compact"
          dir={direction}
          value={block.alt}
          onChange={(event) => onChange({ ...block, alt: event.target.value })}
          required
        />
      </Field>
      <Field label={t("admin.editor.image.caption")}>
        <input
          className="field__input field__input--compact"
          dir={direction}
          value={block.caption ?? ""}
          onChange={(event) => onChange({ ...block, caption: event.target.value || undefined })}
        />
      </Field>
    </div>
  );
}
