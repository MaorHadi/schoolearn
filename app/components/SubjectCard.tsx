import { ArrowLeft, Check } from "lucide-react";
import type { CSSProperties } from "react";
import { Form, Link } from "react-router";
import { t } from "~/i18n";
import type { TextDirection } from "~/shared/direction";
import { resolveSubjectTheme } from "~/shared/subject-theme";
import { ProgressBar } from "./ProgressBar";
import { SubjectIcon } from "./SubjectIcon";

export interface SubjectCardData {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  direction: TextDirection;
  accentColor: string;
  icon: string;
  enrolled: boolean;
  totalLessons: number;
  completedLessons: number;
}

/**
 * One subject as a transit line: the accent-colored rail on the start edge carries the
 * subject icon in its station marker; progress reads as how much of the rail is lit.
 */
export function SubjectCard({ subject }: { subject: SubjectCardData }) {
  const theme = resolveSubjectTheme(subject);
  const done = subject.totalLessons > 0 && subject.completedLessons >= subject.totalLessons;
  const percent =
    subject.totalLessons > 0
      ? Math.round((subject.completedLessons / subject.totalLessons) * 100)
      : 0;
  const style = { "--accent": theme.accentColor, "--progress": `${percent}%` } as CSSProperties;

  return (
    <article className="subject-card" style={style}>
      <div className="subject-card__rail" aria-hidden="true">
        <span className="subject-card__station">
          <SubjectIcon name={theme.icon} size={18} />
        </span>
      </div>

      <div className="subject-card__body">
        <h2 className="subject-card__title" dir={subject.direction}>
          {subject.name}
        </h2>
        {subject.description ? (
          <p className="subject-card__description" dir={subject.direction}>
            {subject.description}
          </p>
        ) : null}

        {subject.enrolled ? (
          <>
            <ProgressBar done={subject.completedLessons} total={subject.totalLessons} />
            <p className="subject-card__meta">
              {done ? (
                <>
                  <Check size={16} aria-hidden="true" /> {t("subjects.allDone")}
                </>
              ) : (
                t("subjects.progress", {
                  done: subject.completedLessons,
                  total: subject.totalLessons,
                })
              )}
            </p>
            <Link to={`/subjects/${subject.slug}`} className="btn btn--primary">
              {subject.completedLessons > 0 ? t("subjects.continue") : t("subjects.start")}
              <ArrowLeft size={18} aria-hidden="true" className="btn__arrow" />
            </Link>
          </>
        ) : (
          <>
            <p className="subject-card__meta">
              {t("subjects.lessonCount", { total: subject.totalLessons })}
            </p>
            <Form method="post">
              <input type="hidden" name="subjectId" value={subject.id} />
              <button type="submit" className="btn btn--ghost">
                {t("subjects.enroll")}
              </button>
            </Form>
          </>
        )}
      </div>
    </article>
  );
}
