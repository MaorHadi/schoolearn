import type { Route } from "./+types/users";
import { t } from "~/i18n";
import { requireRole } from "~/lib/auth/context.server";

export function loader({ context }: Route.LoaderArgs) {
  requireRole(context, "SYSTEM_ADMIN");
  return null;
}

// TODO(user-management): SYSTEM_ADMIN user list, role changes, disable/enable, system settings.
export default function AdminUsers() {
  return (
    <main className="container">
      <h1>{t("admin.users.title")}</h1>
      <p>{t("admin.users.todo")}</p>
    </main>
  );
}
