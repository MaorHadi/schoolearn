import { Link, Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { t } from "~/i18n";
import { requireRole } from "~/server/auth/context.server";

export function loader({ context }: Route.LoaderArgs) {
  requireRole(context, "SYSTEM_ADMIN");
  return null;
}

export default function SystemAdminLayout() {
  return (
    <>
      <header className="container nav">
        <Link to="/subjects">{t("app.name")}</Link>
        <nav>
          <Link to="/admin">{t("admin.title")}</Link>
          <Link to="/system-admin">{t("systemAdmin.title")}</Link>
          <Link to="/system-admin/users">{t("systemAdmin.users.title")}</Link>
        </nav>
      </header>
      <Outlet />
    </>
  );
}
