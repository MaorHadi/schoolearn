import { Check, RotateCcw, X } from "lucide-react";
import { Form, Link, useNavigation } from "react-router";
import { t } from "~/i18n";
import type { QuizOutcome, QuizQuestion } from "~/shared/quiz";

const ANSWER_INTENT = "answer";

/**
 * The lesson's quiz: every question at once, one submit to the lesson route's "answer" intent.
 * With a graded `outcome` the form turns read-only and shows, per question, whether it was
 * right and (when it was not) the correct options; "try again" reloads the page for a clean form.
 */
export function QuizRunner({
  questions,
  passingScore,
  direction,
  outcome,
}: {
  questions: QuizQuestion[];
  passingScore: number;
  direction: "rtl" | "ltr";
  outcome?: QuizOutcome;
}) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle" && navigation.formData?.get("intent") === ANSWER_INTENT;
  const result = outcome?.kind === "result" ? outcome : null;
  const error = outcome?.kind === "error" ? outcome : null;

  return (
    <section className="next-station" aria-labelledby="quiz-title">
      <h2 id="quiz-title" className="next-station__title">
        {t("lesson.quiz.title")}
      </h2>
      <p className="next-station__text">
        {t("lesson.quiz.lead").replace("{passing}", String(passingScore))}
      </p>

      {/* Keyed on the mode so a graded quiz and a fresh one never share input state. */}
      <Form
        key={result ? "graded" : "open"}
        method="post"
        className="mt-4 grid gap-6"
        noValidate
        preventScrollReset
      >
        <input type="hidden" name="intent" value={ANSWER_INTENT} />
        <ol className="m-0 grid list-none gap-6 p-0">
          {questions.map((question, index) => {
            const graded = result?.results.find((entry) => entry.questionId === question.id);
            const multiple = question.type === "MULTIPLE_ANSWER";
            return (
              <li key={question.id}>
                <input type="hidden" name="questionId" value={question.id} />
                <fieldset className="m-0 min-w-0 border-0 p-0" disabled={result !== null}>
                  <legend className="p-0 font-bold" dir={direction}>
                    {index + 1}. {question.prompt}
                  </legend>
                  {multiple ? (
                    <p className="field__hint m-0">{t("lesson.quiz.multipleHint")}</p>
                  ) : null}
                  <div className="mt-2 grid gap-2">
                    {question.options.map((option) => {
                      const showAsCorrect =
                        graded !== undefined &&
                        !graded.correct &&
                        graded.correctOptionIds.includes(option.id);
                      return (
                        <label
                          key={option.id}
                          dir={direction}
                          data-correct-answer={showAsCorrect ? true : undefined}
                          className="flex cursor-pointer items-center gap-3 rounded-md border-2 border-solid border-border bg-background px-3 py-2 has-checked:border-primary has-checked:bg-accent has-disabled:cursor-default data-correct-answer:border-(--ok)"
                        >
                          <input
                            type={multiple ? "checkbox" : "radio"}
                            name={`question-${question.id}`}
                            value={option.id}
                            defaultChecked={graded?.selectedOptionIds.includes(option.id)}
                          />
                          <span>{option.text}</span>
                          {showAsCorrect ? (
                            <span className="ms-auto inline-flex items-center gap-1 font-bold text-(--ok)">
                              <Check size={16} aria-hidden="true" />
                              {t("lesson.quiz.correctAnswer")}
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                {graded ? (
                  <p
                    className={`mt-2 mb-0 inline-flex items-center gap-1 font-bold ${
                      graded.correct ? "text-(--ok)" : "text-destructive"
                    }`}
                  >
                    {graded.correct ? (
                      <Check size={16} aria-hidden="true" />
                    ) : (
                      <X size={16} aria-hidden="true" />
                    )}
                    {graded.correct ? t("lesson.quiz.correct") : t("lesson.quiz.wrong")}
                  </p>
                ) : null}
                {error?.unanswered.includes(question.id) ? (
                  <p className="field__error mt-2 mb-0" role="alert">
                    {t("lesson.quiz.unansweredQuestion")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>

        {error ? (
          <p className="alert" role="alert">
            {t(error.error)}
          </p>
        ) : null}
        {result ? (
          <p className={result.passed ? "banner" : "alert"} role="status">
            {result.passed
              ? t("lesson.quiz.passed").replace("{score}", String(result.score))
              : t("lesson.quiz.failed")
                  .replace("{score}", String(result.score))
                  .replace("{passing}", String(result.passingScore))}
          </p>
        ) : null}

        {result || error?.error === "lesson.quiz.changed" ? (
          <Link to="." replace preventScrollReset className="btn btn--ghost">
            <RotateCcw size={18} aria-hidden="true" />
            {result ? t("lesson.quiz.retry") : t("lesson.quiz.reload")}
          </Link>
        ) : (
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? t("lesson.quiz.submitting") : t("lesson.quiz.submit")}
          </button>
        )}
      </Form>
    </section>
  );
}
