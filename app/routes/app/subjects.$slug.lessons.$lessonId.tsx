import { ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import { Link, data } from "react-router";
import type { Route } from "./+types/subjects.$slug.lessons.$lessonId";
import { LessonContent } from "~/components/lesson-content/LessonContent";
import { QuestionsPlaceholder } from "~/components/QuestionsPlaceholder";
import { t } from "~/i18n";
import { requireUser } from "~/server/auth/context.server";
import { getLessonForUser } from "~/server/content/lessons.server";
import { resolveSubjectTheme } from "~/shared/subject-theme";

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = requireUser(context);
  const lessonId = Number(params.lessonId);
  if (!Number.isInteger(lessonId)) throw data(t("error.notFound"), { status: 404 });

  const { subject, lesson, blocks, assetUrls, tree } = await getLessonForUser(
    user.id,
    params.slug,
    lessonId,
  );
  const section = tree.find((entry) => entry.id === lesson.sectionId);
  const position = section ? section.lessons.findIndex((entry) => entry.id === lesson.id) : -1;
  const progress = section?.lessons.find((entry) => entry.id === lesson.id);

  return {
    subject: {
      slug: subject.slug,
      name: subject.name,
      direction: subject.direction,
      theme: resolveSubjectTheme(subject),
    },
    section: section
      ? { title: section.title, index: position + 1, total: section.lessons.length }
      : null,
    lesson: { id: lesson.id, title: lesson.title, bestScore: progress?.bestScore ?? null },
    blocks,
    assetUrls,
  };
}

// TODO(quiz): add an `action` that validates submitted answers against Question/QuestionOption
// and calls recordAttempt() from ~/server/progress/attempts.server.
export default function LessonPage({ loaderData }: Route.ComponentProps) {
  const { subject, section, lesson, blocks, assetUrls } = loaderData;
  const style = { "--accent": subject.theme.accentColor } as CSSProperties;

  return (
    <main className="container container--narrow page lesson" style={style}>
      <Link to={`/subjects/${subject.slug}`} className="back-link">
        <ChevronRight size={16} aria-hidden="true" className="rtl-flip" />
        <span dir={subject.direction}>{subject.name}</span>
      </Link>

      <header className="lesson-head">
        <h1 className="lesson-head__title" dir={subject.direction}>
          {lesson.title}
        </h1>
        {section ? (
          <p className="lesson-head__section" dir={subject.direction}>
            {section.title}
            <span className="lesson-head__position">
              {t("lesson.position")
                .replace("{index}", String(section.index))
                .replace("{total}", String(section.total))}
            </span>
          </p>
        ) : null}
        {lesson.bestScore != null ? (
          <p className="lesson-head__score">
            {t("subject.bestScore")} {lesson.bestScore}
          </p>
        ) : null}
      </header>

      <article className="lesson-body">
        <LessonContent blocks={blocks} direction={subject.direction} assetUrls={assetUrls} />
      </article>

      <QuestionsPlaceholder backTo={`/subjects/${subject.slug}`} />
    </main>
  );
}
