import { ArrowLeft, ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/subjects.$slug";
import { LessonPath } from "~/components/lesson-path/LessonPath";
import { ProgressBar } from "~/components/ProgressBar";
import { SubjectIcon } from "~/components/SubjectIcon";
import { t } from "~/i18n";
import { requireUser } from "~/server/auth/context.server";
import { getSubjectBySlugForUser } from "~/server/content/subjects.server";
import { getSubjectTree } from "~/server/progress/unlock.server";
import { notFound } from "~/server/route-params.server";
import { countCompleted, findCurrentLesson } from "~/shared/lesson-path";
import { resolveSubjectTheme } from "~/shared/subject-theme";

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = requireUser(context);
  const subject = await getSubjectBySlugForUser(user.id, params.slug);
  if (!subject) throw notFound();
  const tree = await getSubjectTree(user.id, subject.id);
  return {
    subject: {
      slug: subject.slug,
      name: subject.name,
      direction: subject.direction,
      theme: resolveSubjectTheme(subject),
    },
    tree,
  };
}

export default function SubjectPage({ loaderData }: Route.ComponentProps) {
  const { subject, tree } = loaderData;
  const { done, total } = countCompleted(tree);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const current = findCurrentLesson(tree);
  const style = {
    "--accent": subject.theme.accentColor,
    "--progress": `${percent}%`,
  } as CSSProperties;

  return (
    <main className="container page" style={style}>
      <Link to="/subjects" className="back-link">
        <ChevronRight size={16} aria-hidden="true" className="rtl-flip" />
        {t("subject.backToSubjects")}
      </Link>

      <header className="subject-head">
        <span className="subject-head__icon" aria-hidden="true">
          <SubjectIcon name={subject.theme.icon} size={26} />
        </span>
        <h1 className="subject-head__title" dir={subject.direction}>
          {subject.name}
        </h1>

        <div className="subject-head__overall">
          <ProgressBar done={done} total={total} />
          <p className="subject-head__meta">{t("subject.overall", { done, total })}</p>
        </div>

        {current ? (
          <Link
            to={`/subjects/${subject.slug}/lessons/${current.id}`}
            className="btn btn--primary subject-head__cta"
          >
            {t("subject.continueLesson")} <span dir={subject.direction}>{current.title}</span>
            <ArrowLeft size={18} aria-hidden="true" className="btn__arrow" />
          </Link>
        ) : total > 0 ? (
          <p className="subject-head__meta subject-head__cta">{t("subject.allDone")}</p>
        ) : null}
      </header>

      <LessonPath slug={subject.slug} direction={subject.direction} tree={tree} />
    </main>
  );
}
