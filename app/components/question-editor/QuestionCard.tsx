import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { ComponentProps, KeyboardEvent } from "react";
import { t } from "~/i18n";
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  OPTION_MAX_LENGTH,
  PROMPT_MAX_LENGTH,
  QUESTION_TYPES,
  type QuestionDraft,
  type QuestionType,
} from "~/schemas/questions";
import type { TextDirection } from "~/shared/direction";
import { emptyOption, withCorrect, withType } from "./questions";

export interface QuestionCardProps {
  question: QuestionDraft;
  /** 1-based position, for the card's label. */
  number: number;
  direction: TextDirection;
  onChange: (question: QuestionDraft) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
  /** From useDragOrder: `targetProps` for the card, `handleProps` for its grip. */
  rowProps: ComponentProps<"li">;
  handleProps: ComponentProps<"button">;
}

/** One question: toolbar (drag handle, type, remove), the prompt, and its options. */
export function QuestionCard({
  question,
  number,
  direction,
  onChange,
  onMove,
  onRemove,
  rowProps,
  handleProps,
}: QuestionCardProps) {
  const multiple = question.type === "MULTIPLE_ANSWER";
  const handleKeys = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onMove(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onMove(1);
    }
  };
  const setOptionText = (optionId: string, text: string) =>
    onChange({
      ...question,
      options: question.options.map((option) =>
        option.id === optionId ? { ...option, text } : option,
      ),
    });
  const numbered = (key: Parameters<typeof t>[0], position: number) =>
    t(key).replace("{number}", String(position));

  return (
    <li className="block-card" {...rowProps}>
      <div className="block-card__toolbar">
        <button
          type="button"
          className="icon-btn drag-handle"
          aria-label={t("admin.questions.drag")}
          title={t("admin.questions.drag")}
          onKeyDown={handleKeys}
          {...handleProps}
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
        <span className="block-card__type">{numbered("admin.questions.number", number)}</span>
        <label>
          <span className="visually-hidden">{t("admin.questions.type")}</span>
          <select
            className="field__input field__input--compact select"
            value={question.type}
            onChange={(event) => onChange(withType(question, event.target.value as QuestionType))}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`admin.questions.type.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <span className="tree-actions">
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            aria-label={t("admin.questions.remove")}
            title={t("admin.questions.remove")}
            onClick={onRemove}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </span>
      </div>

      <div className="block-card__fields">
        <label className="field">
          <span className="field__label">{t("admin.questions.prompt")}</span>
          <textarea
            className="field__input"
            rows={2}
            dir={direction}
            value={question.prompt}
            maxLength={PROMPT_MAX_LENGTH}
            onChange={(event) => onChange({ ...question, prompt: event.target.value })}
          />
        </label>

        <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
          <legend className="field__label p-0">{t("admin.questions.options")}</legend>
          {question.options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-2">
              <input
                type={multiple ? "checkbox" : "radio"}
                name={`correct-${question.id}`}
                checked={option.isCorrect}
                aria-label={numbered("admin.questions.optionCorrect", index + 1)}
                title={numbered("admin.questions.optionCorrect", index + 1)}
                onChange={(event) =>
                  onChange(withCorrect(question, option.id, event.target.checked))
                }
              />
              <input
                className="field__input field__input--compact min-w-0 flex-1"
                dir={direction}
                value={option.text}
                maxLength={OPTION_MAX_LENGTH}
                aria-label={numbered("admin.questions.optionText", index + 1)}
                placeholder={numbered("admin.questions.optionText", index + 1)}
                onChange={(event) => setOptionText(option.id, event.target.value)}
              />
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                aria-label={numbered("admin.questions.removeOption", index + 1)}
                title={numbered("admin.questions.removeOption", index + 1)}
                disabled={question.options.length <= MIN_OPTIONS}
                onClick={() =>
                  onChange({
                    ...question,
                    options: question.options.filter((entry) => entry.id !== option.id),
                  })
                }
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <div>
            <button
              type="button"
              className="btn btn--ghost btn--small"
              disabled={question.options.length >= MAX_OPTIONS}
              onClick={() =>
                onChange({ ...question, options: [...question.options, emptyOption()] })
              }
            >
              <Plus size={16} aria-hidden="true" />
              {t("admin.questions.addOption")}
            </button>
          </div>
        </fieldset>
      </div>
    </li>
  );
}
