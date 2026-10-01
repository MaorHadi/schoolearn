import { t } from "~/i18n";

// TODO(quiz): replace with the question runner that submits answers to the lesson route's
// action, which calls recordAttempt() from app/server/progress/attempts.server.ts.
export function QuestionsPlaceholder() {
  return (
    <section className="questions-placeholder" aria-live="polite">
      <p>{t("lesson.questionsPlaceholder")}</p>
    </section>
  );
}
