import { t } from "~/i18n";

// TODO(system-settings): SYSTEM_ADMIN system settings UI plugs in here.
export default function SystemAdminIndex() {
  return (
    <main className="container">
      <h1>{t("systemAdmin.title")}</h1>
      <p>{t("systemAdmin.todo")}</p>
    </main>
  );
}
