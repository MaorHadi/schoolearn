import { Users } from "lucide-react";
import { StubPage } from "~/components/StubPage";
import { t } from "~/i18n";

// TODO(user-management): SYSTEM_ADMIN user list, role changes, disable/enable.
// Role is enforced by the system-admin layout loader.
export default function SystemAdminUsers() {
  return (
    <StubPage
      icon={Users}
      title={t("systemAdmin.users.title")}
      lead={t("systemAdmin.users.lead")}
      message={t("systemAdmin.users.todo")}
    />
  );
}
