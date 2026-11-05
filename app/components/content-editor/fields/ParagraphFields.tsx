import { t } from "~/i18n";
import { parseInlineMarkup, serializeInlineMarkup } from "~/shared/inline-markup";
import type { FieldsProps } from "../blocks";
import { MarkupTextarea } from "../MarkupTextarea";

export function ParagraphFields({ block, direction, onChange }: FieldsProps<"paragraph">) {
  return (
    <MarkupTextarea
      label={t("admin.editor.paragraph.text")}
      hint={t("admin.editor.markupHint")}
      initialText={serializeInlineMarkup(block.content)}
      direction={direction}
      rows={4}
      onText={(text) => onChange({ ...block, content: parseInlineMarkup(text) })}
    />
  );
}
