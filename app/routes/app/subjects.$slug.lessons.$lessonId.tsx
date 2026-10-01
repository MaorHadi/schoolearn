import { Link, data } from "react-router";
import type { Route } from "./+types/subjects.$slug.lessons.$lessonId";
import { t } from "~/i18n";
import { LessonContent } from "~/components/lesson-content/LessonContent";
import { QuestionsPlaceholder } from "~/components/QuestionsPlaceholder";
import { requireUser } from "~/server/auth/context.server";
import { getLessonForUser } from "~/server/content/lessons.server";

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = requireUser(context);
  const lessonId = Number(params.lessonId);
  if (!Number.isInteger(lessonId)) throw data(t("error.notFound"), { status: 404 });

  const { subject, lesson, blocks, assetUrls } = await getLessonForUser(
    user.id,
    params.slug,
    lessonId,
  );
  return {
    subject: { slug: subject.slug, direction: subject.direction },
    lesson: { id: lesson.id, title: lesson.title },
    blocks,
    assetUrls,
  };
}

// TODO(quiz): add an `action` that validates submitted answers against Question/QuestionOption
// and calls recordAttempt() from ~/server/progress/attempts.server.
export default function LessonPage({ loaderData }: Route.ComponentProps) {
  const { subject, lesson, blocks, assetUrls } = loaderData;
  return (
    <main className="container">
      <p>
        <Link to={`/subjects/${subject.slug}`}>{t("lesson.back")}</Link>
      </p>
      <h1 dir={subject.direction}>{lesson.title}</h1>
      <LessonContent blocks={blocks} direction={subject.direction} assetUrls={assetUrls} />
      <QuestionsPlaceholder />
    </main>
  );
}
