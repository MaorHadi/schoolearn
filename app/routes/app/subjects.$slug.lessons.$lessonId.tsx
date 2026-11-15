import { ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import { Link, data, redirect } from "react-router";
import type { Route } from "./+types/subjects.$slug.lessons.$lessonId";
import { LessonContent } from "~/components/lesson-content/LessonContent";
import { LessonNext } from "~/components/LessonNext";
import { QuizRunner } from "~/components/quiz/QuizRunner";
import { t } from "~/i18n";
import { SelectedOptionIdsSchema } from "~/schemas/questions";
import { requireUser } from "~/server/auth/context.server";
import { getLessonAnswerKey, getLessonForUser } from "~/server/content/lessons.server";
import { flashFromContext } from "~/server/flash.server";
import { effectivePassingScore, recordAttempt } from "~/server/progress/attempts.server";
import { parseIdParam } from "~/server/route-params.server";
import { gradeQuiz, type QuizOutcome } from "~/shared/quiz";
import { resolveSubjectTheme } from "~/shared/subject-theme";
import { findLesson, findNextLesson } from "~/shared/unlock";

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = requireUser(context);
  const lessonId = parseIdParam(params.lessonId);

  const { subject, lesson, blocks, assetUrls, tree, questions } = await getLessonForUser(
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
      hasQuestions: questions.length > 0,
      passingScore: effectivePassingScore(lesson, subject),
    },
    questions,
    next: next ? { id: next.id, title: next.title } : null,
    blocks,
    assetUrls,
  };
}

/**
 * Grade the submitted quiz and record the attempt. The form posts one `questionId` per question
 * shown and the chosen option ids as `question-<id>`. A quiz that changed since the page was
 * loaded (publishing replaces the questions) is rejected, as is one with unanswered questions.
 */
async function answerQuiz(
  context: Route.ActionArgs["context"],
  form: FormData,
  userId: number,
  lesson: { id: number; title: string; passingScore: number | null },
  subject: { defaultPassingScore: number | null },
  alreadyCompleted: boolean,
) {
  const answerKey = await getLessonAnswerKey(lesson.id);
  if (answerKey.length === 0) throw data(t("error.generic"), { status: 400 });

  const shown = SelectedOptionIdsSchema.safeParse(form.getAll("questionId"));
  const sameQuiz =
    shown.success &&
    shown.data.length === answerKey.length &&
    answerKey.every((question) => shown.data.includes(question.id));
  if (!sameQuiz) {
    return data<QuizOutcome>(
      { kind: "error", error: "lesson.quiz.changed", unanswered: [] },
      { status: 409 },
    );
  }

  const answers = new Map<number, number[]>();
  for (const question of answerKey) {
    const selected = SelectedOptionIdsSchema.safeParse(form.getAll(`question-${question.id}`));
    const valid =
      selected.success &&
      selected.data.every((optionId) => question.optionIds.includes(optionId)) &&
      (question.type === "MULTIPLE_ANSWER" || selected.data.length <= 1);
    if (!valid) throw data(t("error.generic"), { status: 400 });
    answers.set(question.id, selected.data);
  }
  const unanswered = answerKey
    .filter((question) => (answers.get(question.id) ?? []).length === 0)
    .map((question) => question.id);
  if (unanswered.length > 0) {
    return data<QuizOutcome>(
      { kind: "error", error: "lesson.quiz.unanswered", unanswered },
      { status: 400 },
    );
  }

  const grade = gradeQuiz(answerKey, answers);
  const attempt = await recordAttempt({ userId, lessonId: lesson.id, score: grade.score });
  if (attempt.passed && !alreadyCompleted) {
    await flashFromContext(context, "success", "toast.lessonCompleted", { lesson: lesson.title });
  }
  return data<QuizOutcome>({
    kind: "result",
    score: grade.score,
    passed: attempt.passed,
    passingScore: effectivePassingScore(lesson, subject),
    results: grade.results,
  });
}

/**
 * "answer": grade the lesson's quiz (see answerQuiz).
 * "complete": for a lesson without questions, reading it is the whole lesson, so moving on
 * records a full-score attempt (which unlocks the next lesson) and redirects there.
 */
export async function action({ request, context, params }: Route.ActionArgs) {
  const user = requireUser(context);
  const lessonId = parseIdParam(params.lessonId);
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent !== "complete" && intent !== "answer") {
    throw data(t("error.generic"), { status: 400 });
  }

  const { subject, lesson, tree, questionCount } = await getLessonForUser(
    user.id,
    params.slug,
    lessonId,
  );
  const state = findLesson(tree, lesson.id);
  if (intent === "answer") {
    return answerQuiz(context, form, user.id, lesson, subject, state?.completed ?? false);
  }

  if (questionCount > 0 && !state?.completed) {
    // Lessons with questions are completed by passing the quiz, not by clicking through.
    throw data(t("error.lessonLocked"), { status: 403 });
  }

  if (!state?.completed) {
    await recordAttempt({ userId: user.id, lessonId: lesson.id, score: 100 });
    await flashFromContext(context, "success", "toast.lessonCompleted", { lesson: lesson.title });
  }

  const next = findNextLesson(tree, lesson.id);
  return redirect(
    next ? `/subjects/${subject.slug}/lessons/${next.id}` : `/subjects/${subject.slug}`,
  );
}

export default function LessonPage({ loaderData, actionData }: Route.ComponentProps) {
  const { subject, section, lesson, next, blocks, assetUrls, questions } = loaderData;
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
              {t("lesson.position", { index: section.index, total: section.total })}
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

      {lesson.hasQuestions ? (
        <QuizRunner
          questions={questions}
          passingScore={lesson.passingScore}
          direction={subject.direction}
          outcome={actionData}
        />
      ) : null}

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
