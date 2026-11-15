import type { CSSProperties } from "react";
import { data } from "react-router";
import type { Route } from "./+types/lessons.$lessonId.questions";
import { LessonEditorHeader } from "~/components/admin/LessonEditorHeader";
import { QuestionEditor } from "~/components/question-editor/QuestionEditor";
import { SAVE_QUESTIONS_INTENT } from "~/components/question-editor/questions";
import { t } from "~/i18n";
import { QuestionsFormSchema } from "~/schemas/questions";
import { requireRole } from "~/server/auth/context.server";
import { getQuestionsForAdmin, saveQuestionsDraft } from "~/server/content/admin.server";
import { flashFromContext } from "~/server/flash.server";
import { notFound, parseIdParam } from "~/server/route-params.server";
import type { FormError } from "~/shared/field-errors";
import { resolveSubjectTheme } from "~/shared/subject-theme";

export async function loader({ context, params }: Route.LoaderArgs) {
  requireRole(context, "ADMIN");
  const lesson = await getQuestionsForAdmin(parseIdParam(params.lessonId));
  if (!lesson) throw notFound();
  return {
    lesson: {
      id: lesson.id,
      title: lesson.title,
      publishedAt: lesson.publishedAt,
      hasDraft: lesson.hasDraft,
      draftInvalid: lesson.draftInvalid,
      questions: lesson.questions,
    },
    sectionTitle: lesson.section.title,
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
  const lessonId = parseIdParam(params.lessonId);
  const form = await request.formData();
  if (form.get("intent") !== SAVE_QUESTIONS_INTENT) {
    throw data(t("error.generic"), { status: 400 });
  }

  const parsed = QuestionsFormSchema.safeParse({ questions: form.get("questions") });
  if (!parsed.success) {
    return data<FormError>({ formError: "admin.error.questions" }, { status: 400 });
  }
  if (!(await saveQuestionsDraft(lessonId, parsed.data.questions))) throw notFound();
  await flashFromContext(context, "success", "toast.draftSaved");
  return null;
}

export default function EditLessonQuestions({ loaderData, actionData }: Route.ComponentProps) {
  const { lesson, sectionTitle, subject } = loaderData;
  const style = { "--accent": subject.theme.accentColor } as CSSProperties;

  return (
    <main className="container page page--narrow" style={style}>
      <LessonEditorHeader
        lesson={lesson}
        sectionTitle={sectionTitle}
        subject={subject}
        lead="admin.questions.lead"
        draftInvalidMessage="admin.questions.draftInvalid"
      />

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
