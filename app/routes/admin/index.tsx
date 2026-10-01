import { t } from "~/i18n";

// TODO(content-editor): ADMIN content editing UI (subjects, sections, lessons, blocks) plugs in here.
export default function AdminIndex() {
  return (
    <main className="container">
      <h1>{t("admin.title")}</h1>
      <p>{t("admin.todo")}</p>
    </main>
  );
}
