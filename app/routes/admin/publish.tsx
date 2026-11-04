import { CheckCircle2, Upload } from "lucide-react";
import { Form, Link, data, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/publish";
import { SubjectStatusPill } from "~/components/admin/StatusPill";
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

  const count = await publishSubjects(parsed.data.subjectId);
  await flashFromContext(context, "success", "toast.published", { count: String(count) });
  return redirect("/admin");
}

export default function PublishSubjects({ loaderData }: Route.ComponentProps) {
  const { pending } = loaderData;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main className="container page page--narrow">
      <p className="page__back page__back--top">
        <Link to="/admin">{t("admin.subjects.backToList")}</Link>
      </p>
      <header className="page__head">
        <h1 className="page__title">{t("admin.publish.title")}</h1>
        <p className="page__lead">{t("admin.publish.lead")}</p>
      </header>

      {pending.length === 0 ? (
        <div className="empty empty--rich">
          <CheckCircle2 size={28} aria-hidden="true" />
          <p>{t("admin.publish.empty")}</p>
        </div>
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
