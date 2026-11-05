import { t } from "~/i18n";
import { quoteFromMarkup, quoteToMarkup } from "~/shared/inline-markup";
import type { FieldsProps } from "../blocks";
import { MarkupTextarea } from "../MarkupTextarea";

export function QuoteFields({ block, direction, onChange }: FieldsProps<"quote">) {
  return (
    <div className="block-card__fields">
      <MarkupTextarea
        label={t("admin.editor.quote.text")}
        hint={t("admin.editor.quote.hint")}
        initialText={quoteToMarkup(block)}
        direction={direction}
        rows={3}
        onText={(text) => onChange({ ...block, ...quoteFromMarkup(text) })}
      />
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
