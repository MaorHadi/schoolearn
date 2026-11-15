import { CheckCircle2, Upload } from "lucide-react";
import { Form, data, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/publish";
import { SubjectStatusPill } from "~/components/admin/StatusPill";
import { EmptyState } from "~/components/EmptyState";
import { PageHeader } from "~/components/PageHeader";
import { t } from "~/i18n";
import { PublishFormSchema } from "~/schemas/admin-content";
import { requireRole } from "~/server/auth/context.server";
import { listSubjectsForAdmin } from "~/server/content/admin.server";
import { publishSubjects } from "~/server/content/publish.server";
import { flashFromContext } from "~/server/flash.server";

export async function loader({ context }: Route.LoaderArgs) {
  requireRole(context, "ADMIN");
  const subjects = await listSubjectsForAdmin();
  return { pending: subjects.filter((subject) => subject.hasPendingChanges) };
}

/** Publishes every checked subject in one go. */
export async function action({ request, context }: Route.ActionArgs) {
  requireRole(context, "ADMIN");
  const form = await request.formData();
  const parsed = PublishFormSchema.safeParse({ subjectId: form.getAll("subjectId") });
  if (!parsed.success) throw data(t("admin.publish.none"), { status: 400 });

  const result = await publishSubjects(parsed.data.subjectId);
  if (result.failed.length > 0) {
    const subjects = await listSubjectsForAdmin();
    const names = result.failed
      .map((failure) => subjects.find((subject) => subject.id === failure.subjectId)?.name)
      .filter((name): name is string => name !== undefined);
    await flashFromContext(context, "error", "toast.publishFailed", {
      subjects: names.join(", "),
    });
  }
  if (result.published > 0) {
    await flashFromContext(context, "success", "toast.published", {
      count: String(result.published),
    });
  }
  return redirect("/admin");
}

export default function PublishSubjects({ loaderData }: Route.ComponentProps) {
  const { pending } = loaderData;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main className="container page page--narrow">
      <PageHeader
        back={{ to: "/admin", label: t("admin.subjects.backToList") }}
        title={t("admin.publish.title")}
        lead={t("admin.publish.lead")}
      />

      {pending.length === 0 ? (
        <EmptyState icon={CheckCircle2}>{t("admin.publish.empty")}</EmptyState>
      ) : (
        <Form method="post" className="form">
          <ul className="publish-list">
            {pending.map((subject) => (
              <li key={subject.id} className="card publish-item">
                <label className="publish-item__label">
                  <input type="checkbox" name="subjectId" value={subject.id} defaultChecked />
                  <span className="publish-item__name">{subject.name}</span>
                </label>
                <SubjectStatusPill isActive={subject.isActive} hasPendingChanges />
              </li>
            ))}
          </ul>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            <Upload size={18} aria-hidden="true" />
            {busy ? t("admin.publish.publishing") : t("admin.publish.submit")}
          </button>
        </Form>
      )}
    </main>
  );
}
