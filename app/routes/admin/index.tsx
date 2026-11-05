import { Library, Plus, Upload } from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/index";
import { SubjectStatusPill } from "~/components/admin/StatusPill";
import { t } from "~/i18n";
import { requireRole } from "~/server/auth/context.server";
import { listSubjectsForAdmin } from "~/server/content/admin.server";

export async function loader({ context }: Route.LoaderArgs) {
  requireRole(context, "ADMIN");
  return { subjects: await listSubjectsForAdmin() };
}

export default function AdminIndex({ loaderData }: Route.ComponentProps) {
  const { subjects } = loaderData;
  const pendingCount = subjects.filter((subject) => subject.hasPendingChanges).length;

  return (
    <main className="container page">
      <header className="page__head">
        <h1 className="page__title">{t("admin.title")}</h1>
        <p className="page__lead">{t("admin.lead")}</p>
      </header>

      <nav className="link-list" aria-label={t("admin.title")}>
        <Link to="/admin/subjects/new" className="btn btn--primary">
          <Plus size={18} aria-hidden="true" />
          {t("admin.subjects.new")}
        </Link>
        <Link to="/admin/publish" className="btn btn--ghost">
          <Upload size={18} aria-hidden="true" />
          {t("admin.subjects.publishLink")}
          {pendingCount > 0 ? <span className="badge">{pendingCount}</span> : null}
        </Link>
      </nav>

      {subjects.length === 0 ? (
        <div className="empty empty--rich">
          <Library size={28} aria-hidden="true" />
          <p>{t("admin.subjects.empty")}</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">{t("admin.subject.form.name")}</th>
              <th scope="col">{t("admin.subjects.slug")}</th>
              <th scope="col">{t("admin.subjects.order")}</th>
              <th scope="col">{t("admin.subjects.state")}</th>
              <th scope="col">
                <span className="visually-hidden">{t("admin.subjects.edit")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id}>
                <td>
                  <Link to={`/admin/subjects/${subject.id}`} className="admin-table__primary">
                    {subject.name}
                  </Link>
                </td>
                <td className="admin-table__mono">
                  <span className="ltr-value">{subject.slug}</span>
                </td>
                <td>{subject.sortOrder}</td>
                <td>
                  <SubjectStatusPill
                    isActive={subject.isActive}
                    hasPendingChanges={subject.hasPendingChanges}
                  />
                </td>
                <td>
                  <Link to={`/admin/subjects/${subject.id}`} className="btn btn--ghost btn--small">
                    {t("admin.subjects.edit")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
