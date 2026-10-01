import { Form, Link, Outlet } from "react-router";
import type { Route } from "./+types/layout";
import { t } from "~/i18n";
import { requireUser } from "~/server/auth/context.server";
import { hasRole } from "~/shared/roles";

export function loader({ context }: Route.LoaderArgs) {
  const user = requireUser(context);
  return {
    username: user.username,
    isAdmin: hasRole(user.role, "ADMIN"),
    isSystemAdmin: hasRole(user.role, "SYSTEM_ADMIN"),
  };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <header className="container nav">
        <Link to="/subjects" className="brand">
          {t("app.name")}
        </Link>
        <nav>
          <Link to="/subjects">{t("nav.subjects")}</Link>
          {loaderData.isAdmin ? <Link to="/admin">{t("nav.admin")}</Link> : null}
          {loaderData.isSystemAdmin ? <Link to="/system-admin">{t("nav.systemAdmin")}</Link> : null}
          <span>{loaderData.username}</span>
          <Form method="post" action="/logout">
            <button type="submit">{t("nav.logout")}</button>
          </Form>
        </nav>
      </header>
      <Outlet />
    </>
  );
}
