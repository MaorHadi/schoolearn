import { Plus, Save } from "lucide-react";
import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { useDragOrder } from "~/components/content-editor/useDragOrder";
import { t, type TranslationKey } from "~/i18n";
import { MAX_QUESTIONS, type QuestionDraft } from "~/schemas/questions";
import type { TextDirection } from "~/shared/direction";
import { moveToPositionOf } from "~/shared/ordering";
import { QuestionCard } from "./QuestionCard";
import { emptyQuestion, questionsAreComplete, SAVE_QUESTIONS_INTENT } from "./questions";

export { SAVE_QUESTIONS_INTENT } from "./questions";

export interface QuestionEditorProps {
  initialQuestions: QuestionDraft[];
  direction: TextDirection;
  /** Server-side validation message for the last save attempt, if it failed. */
  formError?: TranslationKey;
}

/**
 * Editor for a lesson's question list. The list lives in React state and is posted as one JSON
 * field (`questions`) with intent "save-questions"; the route validates it with
 * QuestionsFormSchema and stores it as the lesson's question draft.
 */
export function QuestionEditor({ initialQuestions, direction, formError }: QuestionEditorProps) {
  const [questions, setQuestions] = useState<QuestionDraft[]>(initialQuestions);
  const drag = useDragOrder<string>((sourceId, targetId) =>
    setQuestions((current) => moveToPositionOf(current, sourceId, targetId) ?? current),
  );
  const navigation = useNavigation();
  const saving =
    navigation.state !== "idle" && navigation.formData?.get("intent") === SAVE_QUESTIONS_INTENT;
  const complete = questionsAreComplete(questions);

  const replaceAt = (index: number, question: QuestionDraft) =>
    setQuestions((current) =>
      current.map((entry, position) => (position === index ? question : entry)),
    );
  const removeAt = (index: number) =>
    setQuestions((current) => current.filter((_entry, position) => position !== index));
  /** Swap the question at `index` with its neighbour; no-op at the edges. */
  const moveAt = (index: number, offset: -1 | 1) =>
    setQuestions((current) => {
      const neighbour = current[index + offset];
      const moving = current[index];
      if (!moving || !neighbour) return current;
      return moveToPositionOf(current, moving.id, neighbour.id) ?? current;
    });

  return (
    <Form method="post" className="editor__form" noValidate>
      <input type="hidden" name="intent" value={SAVE_QUESTIONS_INTENT} />
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />

      {questions.length === 0 ? <p className="empty">{t("admin.questions.empty")}</p> : null}
      <ol className="block-list">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            number={index + 1}
            direction={direction}
            onChange={(next) => replaceAt(index, next)}
            onMove={(offset) => moveAt(index, offset)}
            onRemove={() => removeAt(index)}
            rowProps={drag.targetProps(question.id)}
            handleProps={drag.handleProps(question.id)}
          />
        ))}
      </ol>

      <div className="editor__add">
        <button
          type="button"
          className="btn btn--ghost btn--small"
          disabled={questions.length >= MAX_QUESTIONS}
          onClick={() => setQuestions((current) => [...current, emptyQuestion()])}
        >
          <Plus size={16} aria-hidden="true" />
          {t("admin.questions.add")}
        </button>
      </div>

      {!complete ? (
        <p className="alert" role="alert">
          {t("admin.questions.incomplete")}
        </p>
      ) : null}
      {formError ? (
        <p className="alert" role="alert">
          {t(formError)}
        </p>
      ) : null}
      <button type="submit" className="btn btn--primary" disabled={saving || !complete}>
        <Save size={18} aria-hidden="true" />
        {saving ? t("admin.editor.saving") : t("admin.editor.saveDraft")}
      </button>
    </Form>
  );
}
