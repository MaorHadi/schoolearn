import { Plus } from "lucide-react";
import { useState } from "react";
import { Form } from "react-router";
import { DraftSaveFooter } from "~/components/content-editor/DraftSaveFooter";
import { useDragOrder } from "~/components/content-editor/useDragOrder";
import { t, type TranslationKey } from "~/i18n";
import { MAX_QUESTIONS, type QuestionDraft } from "~/schemas/questions";
import type { TextDirection } from "~/shared/direction";
import { moveToPositionOf, swapWithNeighbour } from "~/shared/ordering";
import { QuestionCard } from "./QuestionCard";
import { emptyQuestion, questionsAreComplete, SAVE_QUESTIONS_INTENT } from "./questions";

interface QuestionEditorProps {
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

  const replace = (question: QuestionDraft) =>
    setQuestions((current) =>
      current.map((entry) => (entry.id === question.id ? question : entry)),
    );
  const remove = (questionId: string) =>
    setQuestions((current) => current.filter((entry) => entry.id !== questionId));

  return (
    <Form method="post" className="editor__form" noValidate>
      <input type="hidden" name="intent" value={SAVE_QUESTIONS_INTENT} />
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />

      {questions.length === 0 ? <p className="empty">{t("admin.questions.empty")}</p> : null}
      <ol className="editor-list">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            number={index + 1}
            direction={direction}
            onChange={replace}
            onMove={(moveDirection) =>
              setQuestions(
                (current) => swapWithNeighbour(current, question.id, moveDirection) ?? current,
              )
            }
            onRemove={() => remove(question.id)}
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

      <DraftSaveFooter
        intent={SAVE_QUESTIONS_INTENT}
        complete={questionsAreComplete(questions)}
        incompleteMessage="admin.questions.incomplete"
        formError={formError}
      />
    </Form>
  );
}
