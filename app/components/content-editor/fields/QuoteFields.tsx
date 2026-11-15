import { Field } from "~/components/forms/Field";
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
        <Field label={t("admin.editor.quote.reference")}>
          <input
            className="field__input field__input--compact"
            dir={direction}
            value={block.reference ?? ""}
            onChange={(event) => onChange({ ...block, reference: event.target.value || undefined })}
          />
        </Field>
        <Field label={t("admin.editor.quote.sourceLabel")}>
          <input
            className="field__input field__input--compact"
            dir={direction}
            value={block.sourceLabel ?? ""}
            onChange={(event) =>
              onChange({ ...block, sourceLabel: event.target.value || undefined })
            }
          />
        </Field>
      </div>
    </div>
  );
}
