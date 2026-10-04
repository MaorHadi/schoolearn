import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { t } from "~/i18n";

// TODO(quiz): replace with the question runner that submits answers to the lesson route's
// action, which calls recordAttempt() from app/server/progress/attempts.server.ts.
/**
 * Where the lesson's questions will live. Until the quiz exists it explains itself and offers
 * the way back to the path.
 */
export function QuestionsPlaceholder({ backTo }: { backTo: string }) {
  return (
    <section className="next-station" aria-labelledby="next-station-title">
      <h2 id="next-station-title" className="next-station__title">
        {t("lesson.questionsTitle")}
      </h2>
      <p className="next-station__text">{t("lesson.questionsPlaceholder")}</p>
      <Link to={backTo} className="btn btn--ghost">
        {t("lesson.back")}
        <ArrowLeft size={18} aria-hidden="true" className="btn__arrow" />
      </Link>
    </section>
  );
}
