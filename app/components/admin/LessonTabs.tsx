import { NavLink } from "react-router";
import { t } from "~/i18n";

/** Switches between the two editors of a lesson: its content blocks and its questions. */
export function LessonTabs({ lessonId }: { lessonId: number }) {
  const className = ({ isActive }: { isActive: boolean }) =>
    `btn btn--small ${isActive ? "btn--primary" : "btn--ghost"}`;
  return (
    <nav className="link-list" aria-label={t("admin.lesson.tabs")}>
      <NavLink to={`/admin/lessons/${lessonId}`} end className={className}>
        {t("admin.lesson.tabs.content")}
      </NavLink>
      <NavLink to={`/admin/lessons/${lessonId}/questions`} className={className}>
        {t("admin.lesson.tabs.questions")}
      </NavLink>
    </nav>
  );
}
