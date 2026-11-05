import { t } from "~/i18n";
import type { FieldsProps } from "../blocks";

export function HeadingFields({ block, direction, onChange }: FieldsProps<"heading">) {
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
