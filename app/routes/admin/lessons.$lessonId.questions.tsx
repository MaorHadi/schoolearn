import type { CSSProperties } from "react";
import { Link, data } from "react-router";
import type { Route } from "./+types/lessons.$lessonId.questions";
import { LessonTabs } from "~/components/admin/LessonTabs";
import { RowStatusPill } from "~/components/admin/StatusPill";
import { QuestionEditor, SAVE_QUESTIONS_INTENT } from "~/components/question-editor/QuestionEditor";
import { t, type TranslationKey } from "~/i18n";
import { QuestionsFormSchema } from "~/schemas/questions";
import { requireRole } from "~/server/auth/context.server";
import { getQuestionsForAdmin, saveQuestionsDraft } from "~/server/content/admin.server";
import { flashFromContext } from "~/server/flash.server";
import { resolveSubjectTheme } from "~/shared/subject-theme";

/** The save action answers with this on validation failure; the editor stays mounted. */
export interface QuestionsFormError {
  formError: TranslationKey;
}

function parseLessonId(raw: string | undefined): number {
  const lessonId = Number(raw);
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    throw data(t("error.notFound"), { status: 404 });
  }
  return lessonId;
}

export async function loader({ context, params }: Route.LoaderArgs) {
  requireRole(context, "ADMIN");
  const lesson = await getQuestionsForAdmin(parseLessonId(params.lessonId));
  if (!lesson) throw data(t("error.notFound"), { status: 404 });
  return {
    lesson: {
      id: lesson.id,
      title: lesson.title,
      publishedAt: lesson.publishedAt,
      hasDraft: lesson.hasDraft,
      draftInvalid: lesson.draftInvalid,
      questions: lesson.questions,
    },
    section: { title: lesson.section.title },
    subject: {
      id: lesson.section.subject.id,
      name: lesson.section.subject.name,
      direction: lesson.section.subject.direction,
      theme: resolveSubjectTheme(lesson.section.subject),
    },
  };
}

/**
 * "save-questions": store the question list as the lesson's question draft (learners keep the
 * live quiz until the subject is published). Validation failures come back as `formError` so the
 * editor keeps its unsaved state.
 */
export async function action({ request, context, params }: Route.ActionArgs) {
  requireRole(context, "ADMIN");
  const lessonId = parseLessonId(params.lessonId);
  const form = await request.formData();
  if (form.get("intent") !== SAVE_QUESTIONS_INTENT) {
    throw data(t("error.generic"), { status: 400 });
  }

  const parsed = QuestionsFormSchema.safeParse({ questions: form.get("questions") });
  if (!parsed.success) {
    return data<QuestionsFormError>({ formError: "admin.error.questions" }, { status: 400 });
  }
  if (!(await saveQuestionsDraft(lessonId, parsed.data.questions))) {
    throw data(t("error.notFound"), { status: 404 });
  }
  await flashFromContext(context, "success", "toast.draftSaved");
  return null;
}

export default function EditLessonQuestions({ loaderData, actionData }: Route.ComponentProps) {
  const { lesson, section, subject } = loaderData;
  const style = { "--accent": subject.theme.accentColor } as CSSProperties;

  return (
    <main className="container page page--narrow" style={style}>
      <p className="page__back page__back--top">
        <Link to={`/admin/subjects/${subject.id}`}>
          {t("admin.lesson.backToSubject").replace("{subject}", subject.name)}
        </Link>
      </p>
      <header className="page__head">
        <h1 className="page__title" dir={subject.direction}>
          {lesson.title}
        </h1>
        <p className="page__lead" dir={subject.direction}>
          {section.title}
        </p>
        <RowStatusPill publishedAt={lesson.publishedAt} hasDraft={lesson.hasDraft} />
        <p className="muted">{t("admin.questions.lead")}</p>
        {lesson.draftInvalid ? (
          <p className="alert" role="alert">
            {t("admin.questions.draftInvalid")}
          </p>
        ) : null}
        <LessonTabs lessonId={lesson.id} />
      </header>

      {/* Keyed on the lesson so navigating between lessons resets the editor state. */}
      <div className="mt-6">
        <QuestionEditor
          key={lesson.id}
          initialQuestions={lesson.questions}
          direction={subject.direction}
          formError={actionData?.formError}
        />
      </div>
    </main>
  );
}
