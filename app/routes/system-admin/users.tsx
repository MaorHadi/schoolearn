import { t } from "~/i18n";

// TODO(user-management): SYSTEM_ADMIN user list, role changes, disable/enable.
// Role is enforced by the system-admin layout loader.
export default function SystemAdminUsers() {
  return (
    <main className="container">
      <h1>{t("systemAdmin.users.title")}</h1>
      <p>{t("systemAdmin.users.todo")}</p>
    </main>
  );
}
