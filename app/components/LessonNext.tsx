import { ArrowLeft, Lock } from "lucide-react";
import { Form, Link, useNavigation } from "react-router";
import { t } from "~/i18n";
import type { TextDirection } from "~/shared/direction";

interface NextLessonTarget {
  id: number;
  title: string;
}

/**
 * The last station of a lesson page: the way onward.
 *
 * - No questions (or already completed): a button that marks the lesson done (if needed) and
 *   moves to the next lesson, or back to the path when this was the last one.
 * - Questions exist and the lesson is not completed yet: the next lesson stays locked until the
 *   quiz above it (QuizRunner) is passed.
 */
export function LessonNext({
  next,
  completed,
  hasQuestions,
  backTo,
  direction,
}: {
  next: NextLessonTarget | null;
  completed: boolean;
  hasQuestions: boolean;
  backTo: string;
  direction: TextDirection;
}) {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const locked = hasQuestions && !completed;

  return (
    <section className="next-station" aria-labelledby="next-station-title">
      <h2 id="next-station-title" className="next-station__title">
        {next ? t("lesson.nextTitle") : t("lesson.endTitle")}
      </h2>
      {next ? (
        <p className="next-station__text" dir={direction}>
          {next.title}
        </p>
      ) : (
        <p className="next-station__text">{t("subject.allDone")}</p>
      )}

      {locked ? (
        <>
          <p className="next-station__hint">
            <Lock size={16} aria-hidden="true" />
            {t("lesson.nextLocked")}
          </p>
          <Link to={backTo} className="btn btn--ghost">
            {t("lesson.back")}
            <ArrowLeft size={18} aria-hidden="true" className="btn__arrow" />
          </Link>
        </>
      ) : (
        <Form method="post">
          <input type="hidden" name="intent" value="complete" />
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {next ? t("lesson.next") : t("lesson.finish")}
            <ArrowLeft size={18} aria-hidden="true" className="btn__arrow" />
          </button>
        </Form>
      )}
    </section>
  );
}
