import { Plus, Trash2 } from "lucide-react";
import type { ComponentProps } from "react";
import { DragHandle } from "~/components/content-editor/DragHandle";
import { Field } from "~/components/forms/Field";
import { IconButton } from "~/components/IconButton";
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
import type { MoveDirection } from "~/shared/ordering";
import { emptyOption, withCorrect, withType } from "./questions";

interface QuestionCardProps {
  question: QuestionDraft;
  /** 1-based position, for the card's label. */
  number: number;
  direction: TextDirection;
  onChange: (question: QuestionDraft) => void;
  onMove: (direction: MoveDirection) => void;
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
  const setOptionText = (optionId: string, text: string) =>
    onChange({
      ...question,
      options: question.options.map((option) =>
        option.id === optionId ? { ...option, text } : option,
      ),
    });

  return (
    <li className="block-card" {...rowProps}>
      <div className="block-card__toolbar">
        <DragHandle label={t("admin.questions.drag")} onMove={onMove} {...handleProps} />
        <span className="block-card__type">{t("admin.questions.number", { number })}</span>
        <Field label={t("admin.questions.type")} hideLabel className="block-card__dir">
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
        </Field>
        <span className="tree-actions">
          <IconButton
            label={t("admin.questions.remove")}
            icon={<Trash2 size={16} aria-hidden="true" />}
            danger
            onClick={onRemove}
          />
        </span>
      </div>

      <div className="block-card__fields">
        <Field label={t("admin.questions.prompt")}>
          <textarea
            className="field__input"
            rows={2}
            dir={direction}
            value={question.prompt}
            maxLength={PROMPT_MAX_LENGTH}
            onChange={(event) => onChange({ ...question, prompt: event.target.value })}
          />
        </Field>

        <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
          <legend className="field__label p-0">{t("admin.questions.options")}</legend>
          {question.options.map((option, index) => {
            const position = { number: index + 1 };
            return (
              <div key={option.id} className="flex items-center gap-2">
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={`correct-${question.id}`}
                  checked={option.isCorrect}
                  aria-label={t("admin.questions.optionCorrect", position)}
                  title={t("admin.questions.optionCorrect", position)}
                  onChange={(event) =>
                    onChange(withCorrect(question, option.id, event.target.checked))
                  }
                />
                <input
                  className="field__input field__input--compact min-w-0 flex-1"
                  dir={direction}
                  value={option.text}
                  maxLength={OPTION_MAX_LENGTH}
                  aria-label={t("admin.questions.optionText", position)}
                  placeholder={t("admin.questions.optionText", position)}
                  onChange={(event) => setOptionText(option.id, event.target.value)}
                />
                <IconButton
                  label={t("admin.questions.removeOption", position)}
                  icon={<Trash2 size={16} aria-hidden="true" />}
                  danger
                  disabled={question.options.length <= MIN_OPTIONS}
                  onClick={() =>
                    onChange({
                      ...question,
                      options: question.options.filter((entry) => entry.id !== option.id),
                    })
                  }
                />
              </div>
            );
          })}
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
