import { ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import { Link, data, redirect } from "react-router";
import type { Route } from "./+types/subjects.$slug.lessons.$lessonId";
import { LessonContent } from "~/components/lesson-content/LessonContent";
import { LessonNext } from "~/components/LessonNext";
import { t } from "~/i18n";
import { requireUser, sessionContext } from "~/server/auth/context.server";
import { getLessonForUser } from "~/server/content/lessons.server";
import { setFlash } from "~/server/flash.server";
import { recordAttempt } from "~/server/progress/attempts.server";
import { resolveSubjectTheme } from "~/shared/subject-theme";
import { findLesson, findNextLesson } from "~/shared/unlock";

function parseLessonId(raw: string | undefined): number {
  const lessonId = Number(raw);
  if (!Number.isInteger(lessonId)) throw data(t("error.notFound"), { status: 404 });
  return lessonId;
}

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = requireUser(context);
  const lessonId = parseLessonId(params.lessonId);

  const { subject, lesson, blocks, assetUrls, tree, questionCount } = await getLessonForUser(
    user.id,
    params.slug,
    lessonId,
  );
  const section = tree.find((entry) => entry.id === lesson.sectionId);
  const position = section ? section.lessons.findIndex((entry) => entry.id === lesson.id) : -1;
  const state = findLesson(tree, lesson.id);
  const next = findNextLesson(tree, lesson.id);

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
    lesson: {
      id: lesson.id,
      title: lesson.title,
      bestScore: state?.bestScore ?? null,
      completed: state?.completed ?? false,
      hasQuestions: questionCount > 0,
    },
    next: next ? { id: next.id, title: next.title } : null,
    blocks,
    assetUrls,
  };
}

// TODO(quiz): add an "answer" intent that validates submitted answers against
// Question/QuestionOption and calls recordAttempt() with the real score.
/**
 * "complete": for a lesson without questions, reading it is the whole lesson, so moving on
 * records a full-score attempt (which unlocks the next lesson) and redirects there.
 */
export async function action({ request, context, params }: Route.ActionArgs) {
  const user = requireUser(context);
  const lessonId = parseLessonId(params.lessonId);
  const form = await request.formData();
  if (form.get("intent") !== "complete") throw data(t("error.generic"), { status: 400 });

  const { subject, lesson, tree, questionCount } = await getLessonForUser(
    user.id,
    params.slug,
    lessonId,
  );
  const state = findLesson(tree, lesson.id);
  if (questionCount > 0 && !state?.completed) {
    // Lessons with questions are completed by passing the quiz, not by clicking through.
    throw data(t("error.lessonLocked"), { status: 403 });
  }

  if (!state?.completed) {
    await recordAttempt({ userId: user.id, lessonId: lesson.id, score: 100 });
    const session = context.get(sessionContext);
    if (session)
      await setFlash(session.id, "success", "toast.lessonCompleted", { lesson: lesson.title });
  }

  const next = findNextLesson(tree, lesson.id);
  return redirect(
    next ? `/subjects/${subject.slug}/lessons/${next.id}` : `/subjects/${subject.slug}`,
  );
}

export default function LessonPage({ loaderData }: Route.ComponentProps) {
  const { subject, section, lesson, next, blocks, assetUrls } = loaderData;
  const style = { "--accent": subject.theme.accentColor } as CSSProperties;
  const backTo = `/subjects/${subject.slug}`;

  return (
    <main className="container container--narrow page lesson" style={style}>
      <Link to={backTo} className="back-link">
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
        {lesson.hasQuestions && lesson.bestScore != null ? (
          <p className="lesson-head__score">
            {t("subject.bestScore")} {lesson.bestScore}
          </p>
        ) : null}
      </header>

      <article className="lesson-body">
        <LessonContent blocks={blocks} direction={subject.direction} assetUrls={assetUrls} />
      </article>

      <LessonNext
        next={next}
        completed={lesson.completed}
        hasQuestions={lesson.hasQuestions}
        backTo={backTo}
        direction={subject.direction}
      />
    </main>
  );
}
