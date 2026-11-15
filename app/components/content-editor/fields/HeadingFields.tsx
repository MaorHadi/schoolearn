import { Field } from "~/components/forms/Field";
import { t } from "~/i18n";
import type { FieldsProps } from "../blocks";

export function HeadingFields({ block, direction, onChange }: FieldsProps<"heading">) {
  return (
    <div className="block-card__fields">
      <Field label={t("admin.editor.heading.level")}>
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
      </Field>
      <Field label={t("admin.editor.heading.text")}>
        <input
          className="field__input"
          dir={direction}
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
        />
      </Field>
    </div>
  );
}
