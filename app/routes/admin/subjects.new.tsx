import { Link, data, redirect } from "react-router";
import type { Route } from "./+types/subjects.new";
import {
  SUBJECT_FIELD_MESSAGES,
  SubjectForm,
  type SubjectFieldErrors,
} from "~/components/admin/SubjectForm";
import { PageHeader } from "~/components/PageHeader";
import { t } from "~/i18n";
import { SubjectInputSchema } from "~/schemas/admin-content";
import { requireRole } from "~/server/auth/context.server";
import { createSubject } from "~/server/content/admin.server";
import { flashFromContext } from "~/server/flash.server";
import { fieldErrorsFrom } from "~/shared/field-errors";

interface ActionResult {
  fieldErrors?: SubjectFieldErrors;
}

export function loader({ context }: Route.LoaderArgs) {
  requireRole(context, "ADMIN");
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  requireRole(context, "ADMIN");
  const form = Object.fromEntries(await request.formData());
  const parsed = SubjectInputSchema.safeParse(form);
  if (!parsed.success) {
    return data<ActionResult>(
      { fieldErrors: fieldErrorsFrom(parsed.error, SUBJECT_FIELD_MESSAGES) },
      { status: 400 },
    );
  }

  const result = await createSubject(parsed.data);
  if (!result.ok) {
    return data<ActionResult>({ fieldErrors: { slug: "admin.error.slugTaken" } }, { status: 409 });
  }
  await flashFromContext(context, "success", "toast.subjectCreated", {
    subject: parsed.data.name,
  });
  return redirect(`/admin/subjects/${result.id}`);
}

export default function NewSubject({ actionData }: Route.ComponentProps) {
  return (
    <main className="container page page--narrow">
      <PageHeader title={t("admin.subject.newTitle")} lead={t("admin.subject.newLead")} />

      <SubjectForm
        intent="create-subject"
        fieldErrors={actionData?.fieldErrors}
        submitLabel={t("admin.subject.form.create")}
      />

      <p className="page__back">
        <Link to="/admin">{t("admin.subjects.backToList")}</Link>
      </p>
    </main>
  );
}
