import { Link, Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { t } from "~/i18n";
import { requireRole } from "~/lib/auth/context.server";
import { hasRole } from "~/lib/auth/roles";

export function loader({ context }: Route.LoaderArgs) {
  const user = requireRole(context, "ADMIN");
  return { isSystemAdmin: hasRole(user.role, "SYSTEM_ADMIN") };
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <header className="container nav">
        <Link to="/subjects">{t("app.name")}</Link>
        <nav>
          <Link to="/admin">{t("admin.title")}</Link>
          {loaderData.isSystemAdmin ? (
            <Link to="/system-admin">{t("systemAdmin.title")}</Link>
          ) : null}
        </nav>
      </header>
      <Outlet />
    </>
  );
}
