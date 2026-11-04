import { MessageSquarePlus, SlidersHorizontal, Users } from "lucide-react";
import { Link } from "react-router";
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
    >
      <nav className="link-list" aria-label={t("systemAdmin.sections")}>
        <Link to="/system-admin/users" className="btn btn--ghost">
          <Users size={18} aria-hidden="true" />
          {t("systemAdmin.users.title")}
        </Link>
        <Link to="/system-admin/suggestions" className="btn btn--ghost">
          <MessageSquarePlus size={18} aria-hidden="true" />
          {t("systemAdmin.suggestions.title")}
        </Link>
      </nav>
    </StubPage>
  );
}
