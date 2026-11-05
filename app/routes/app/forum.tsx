import { MessagesSquare } from "lucide-react";
import { StubPage } from "~/components/StubPage";
import { t } from "~/i18n";

// TODO(forum): discussion forum (threads, replies, moderation).
export default function Forum() {
  return (
    <StubPage
      icon={MessagesSquare}
      title={t("forum.title")}
      lead={t("forum.lead")}
      message={t("forum.todo")}
    />
  );
}
