import { t } from "~/i18n";
import { parseInlineMarkup, serializeInlineMarkup } from "~/shared/inline-markup";
import type { FieldsProps } from "../blocks";
import { MarkupTextarea } from "../MarkupTextarea";

export function ListFields({ block, direction, onChange }: FieldsProps<"list">) {
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
      <MarkupTextarea
        label={t("admin.editor.list.items")}
        hint={t("admin.editor.list.hint")}
        initialText={block.items.map(serializeInlineMarkup).join("\n")}
        direction={direction}
        rows={4}
        onText={(text) =>
          onChange({
            ...block,
            items: text
              .split("\n")
              .filter((line) => line.length > 0)
              .map(parseInlineMarkup),
          })
        }
      />
    </div>
  );
}
