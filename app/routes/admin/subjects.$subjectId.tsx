import { Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { Form, data, redirect } from "react-router";
import type { ZodError } from "zod";
import type { Route } from "./+types/subjects.$subjectId";
import { SubjectStatusPill } from "~/components/admin/StatusPill";
import {
  StructureTree,
  TREE_FIELD_MESSAGES,
  type TreeActionResult,
} from "~/components/admin/StructureTree";
import {
  SUBJECT_FIELD_MESSAGES,
  SubjectForm,
  type SubjectFieldErrors,
} from "~/components/admin/SubjectForm";
import { PageHeader } from "~/components/PageHeader";
import { t } from "~/i18n";
import { SubjectPageIntentSchema } from "~/schemas/admin-content";
import { requireRole } from "~/server/auth/context.server";
import {
  createLesson,
  createSection,
  deleteLesson,
  deleteSection,
  deleteSubject,
  getSubjectForAdmin,
  listSubjectsForAdmin,
  moveLesson,
  moveSection,
  reorderLesson,
  reorderSection,
  updateLesson,
  updateSection,
  updateSubject,
} from "~/server/content/admin.server";
import { flashFromContext } from "~/server/flash.server";
import { notFound, parseIdParam } from "~/server/route-params.server";
import { fieldErrorsFrom } from "~/shared/field-errors";

type ActionResult = SubjectActionResult | TreeActionResult;

interface SubjectActionResult {
  kind: "subject";
  fieldErrors: SubjectFieldErrors;
}

/** Field errors for one inline tree form; the ids say which row they belong to. */
function treeErrorsFrom(
  form: Record<string, FormDataEntryValue>,
  error: ZodError,
): TreeActionResult {
  const rowId = (name: "sectionId" | "lessonId") => {
    const raw = form[name];
    const id = typeof raw === "string" ? Number(raw) : Number.NaN;
    return Number.isInteger(id) && id > 0 ? id : undefined;
  };
  const intent = form.intent;
  return {
    kind: "tree",
    intent: typeof intent === "string" ? intent : "",
    sectionId: rowId("sectionId"),
    lessonId: rowId("lessonId"),
    fieldErrors: fieldErrorsFrom(error, TREE_FIELD_MESSAGES),
  };
}

export async function loader({ context, params }: Route.LoaderArgs) {
  requireRole(context, "ADMIN");
  const subjectId = parseIdParam(params.subjectId);
  const [subject, listed] = await Promise.all([
    getSubjectForAdmin(subjectId),
    listSubjectsForAdmin(),
  ]);
  if (!subject) throw notFound();
  const hasPendingChanges =
    listed.find((entry) => entry.id === subjectId)?.hasPendingChanges ?? false;
  return { subject, hasPendingChanges };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  requireRole(context, "ADMIN");
  const subjectId = parseIdParam(params.subjectId);
  const form = Object.fromEntries(await request.formData());
  const parsed = SubjectPageIntentSchema.safeParse(form);
  if (!parsed.success) {
    if (form.intent === "update-subject") {
      return data<ActionResult>(
        {
          kind: "subject",
          fieldErrors: fieldErrorsFrom(parsed.error, SUBJECT_FIELD_MESSAGES),
        },
        { status: 400 },
      );
    }
    const errors = treeErrorsFrom(form, parsed.error);
    if (Object.keys(errors.fieldErrors).length === 0) {
      throw data(t("error.generic"), { status: 400 });
    }
    return data<ActionResult>(errors, { status: 400 });
  }

  const input = parsed.data;
  switch (input.intent) {
    case "update-subject": {
      const { intent: _intent, ...values } = input;
      const result = await updateSubject(subjectId, values);
      if (!result.ok && result.reason === "SLUG_TAKEN") {
        return data<ActionResult>(
          { kind: "subject", fieldErrors: { slug: "admin.error.slugTaken" } },
          { status: 409 },
        );
      }
      if (!result.ok) throw notFound();
      await flashFromContext(context, "success", "toast.subjectUpdated");
      return null;
    }
    case "delete-subject": {
      if (!(await deleteSubject(subjectId))) throw notFound();
      await flashFromContext(context, "success", "toast.subjectDeleted");
      return redirect("/admin");
    }
    case "create-section": {
      const result = await createSection(subjectId, input.title);
      if (!result.ok) throw notFound();
      await flashFromContext(context, "success", "toast.sectionCreated");
      return null;
    }
    case "update-section": {
      if (!(await updateSection(input.sectionId, input.title))) throw notFound();
      await flashFromContext(context, "success", "toast.sectionUpdated");
      return null;
    }
    case "delete-section": {
      if (!(await deleteSection(input.sectionId))) throw notFound();
      await flashFromContext(context, "success", "toast.sectionDeleted");
      return null;
    }
    case "move-section-up":
    case "move-section-down": {
      await moveSection(input.sectionId, input.intent === "move-section-up" ? "up" : "down");
      return null;
    }
    case "reorder-section": {
      await reorderSection(input.sectionId, input.targetSectionId);
      return null;
    }
    case "create-lesson": {
      const { intent: _intent, sectionId, ...values } = input;
      const result = await createLesson(sectionId, values);
      if (!result.ok) throw notFound();
      await flashFromContext(context, "success", "toast.lessonCreated");
      return null;
    }
    case "update-lesson": {
      const { intent: _intent, lessonId, ...values } = input;
      if (!(await updateLesson(lessonId, values))) throw notFound();
      await flashFromContext(context, "success", "toast.lessonUpdated");
      return null;
    }
    case "delete-lesson": {
      if (!(await deleteLesson(input.lessonId))) throw notFound();
      await flashFromContext(context, "success", "toast.lessonDeleted");
      return null;
    }
    case "move-lesson-up":
    case "move-lesson-down": {
      await moveLesson(input.lessonId, input.intent === "move-lesson-up" ? "up" : "down");
      return null;
    }
    case "reorder-lesson": {
      await reorderLesson(input.lessonId, input.targetLessonId);
      return null;
    }
  }
}

function confirmDelete(event: MouseEvent<HTMLButtonElement>) {
  if (!window.confirm(t("admin.subject.deleteConfirm"))) event.preventDefault();
}

export default function EditSubject({ loaderData, actionData }: Route.ComponentProps) {
  const { subject, hasPendingChanges } = loaderData;
  const subjectErrors = actionData?.kind === "subject" ? actionData.fieldErrors : undefined;
  const treeErrors = actionData?.kind === "tree" ? actionData : undefined;

  return (
    <main className="container page">
      <PageHeader
        back={{ to: "/admin", label: t("admin.subjects.backToList") }}
        title={subject.name}
        lead={t("admin.subject.editLead")}
        dir={subject.direction}
      >
        <SubjectStatusPill isActive={subject.isActive} hasPendingChanges={hasPendingChanges} />
      </PageHeader>

      <div className="admin-columns">
        <section className="admin-columns__side" aria-labelledby="subject-details">
          <h2 id="subject-details" className="section-title">
            {t("admin.subject.details")}
          </h2>
          <SubjectForm
            intent="update-subject"
            values={subject}
            fieldErrors={subjectErrors}
            submitLabel={t("admin.subject.form.save")}
          />
          <Form method="post" className="danger-zone">
            <input type="hidden" name="intent" value="delete-subject" />
            <button type="submit" className="btn btn--danger" onClick={confirmDelete}>
              <Trash2 size={16} aria-hidden="true" />
              {t("admin.subject.delete")}
            </button>
          </Form>
        </section>

        <div className="admin-columns__main">
          <StructureTree
            sections={subject.sections}
            direction={subject.direction}
            errors={treeErrors}
          />
        </div>
      </div>
    </main>
  );
}
