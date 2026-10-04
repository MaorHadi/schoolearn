import { SlidersHorizontal } from "lucide-react";
import { StubPage } from "~/components/StubPage";
import { t } from "~/i18n";

// TODO(system-settings): SYSTEM_ADMIN system settings UI plugs in here.
export default function SystemAdminIndex() {
  return (
    <StubPage
      icon={SlidersHorizontal}
      title={t("systemAdmin.title")}
      lead={t("systemAdmin.lead")}
      message={t("systemAdmin.todo")}
    />
  );
}
