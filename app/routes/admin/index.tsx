import { PencilRuler } from "lucide-react";
import { StubPage } from "~/components/StubPage";
import { t } from "~/i18n";

// TODO(content-editor): ADMIN content editing UI (subjects, sections, lessons, blocks) plugs in here.
export default function AdminIndex() {
  return (
    <StubPage
      icon={PencilRuler}
      title={t("admin.title")}
      lead={t("admin.lead")}
      message={t("admin.todo")}
    />
  );
}
