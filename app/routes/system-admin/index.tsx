import { MessageSquarePlus, SlidersHorizontal, Users } from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/index";
import { PageHeader } from "~/components/PageHeader";
import { t } from "~/i18n";
import { requireRole } from "~/server/auth/context.server";

export function loader({ context }: Route.LoaderArgs) {
  requireRole(context, "SYSTEM_ADMIN");
  return null;
}

/** Hub of the system-admin area: one link per section. */
export default function SystemAdminIndex() {
  return (
    <main className="container page">
      <PageHeader title={t("systemAdmin.title")} lead={t("systemAdmin.lead")} />
      <nav className="link-list" aria-label={t("systemAdmin.sections")}>
        <Link to="/system-admin/users" className="btn btn--ghost">
          <Users size={18} aria-hidden="true" />
          {t("systemAdmin.users.title")}
        </Link>
        <Link to="/system-admin/suggestions" className="btn btn--ghost">
          <MessageSquarePlus size={18} aria-hidden="true" />
          {t("systemAdmin.suggestions.title")}
        </Link>
        <Link to="/system-admin/settings" className="btn btn--ghost">
          <SlidersHorizontal size={18} aria-hidden="true" />
          {t("systemAdmin.settings.title")}
        </Link>
      </nav>
    </main>
  );
}
