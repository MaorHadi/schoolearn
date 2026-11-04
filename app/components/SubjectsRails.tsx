import { GraduationCap, Mail, MessageSquarePlus, MessagesSquare } from "lucide-react";
import { Link } from "react-router";
import { t } from "~/i18n";

/**
 * Side-rail pieces for the subjects page: a callout for teachers, links to the forum and the
 * suggestions form, and reserved (empty) advertising slots.
 */

export function TeacherCallout({ email }: { email: string | null }) {
  if (!email) return null;
  return (
    <section className="rail__card" aria-labelledby="teacher-callout-title">
      <GraduationCap className="rail__icon" size={28} aria-hidden="true" />
      <h2 id="teacher-callout-title" className="rail__title">
        {t("rail.teachers.title")}
      </h2>
      <p className="rail__lead">{t("rail.teachers.lead")}</p>
      <a className="btn btn--primary" href={`mailto:${email}`}>
        <Mail size={18} aria-hidden="true" />
        {t("rail.teachers.contact")}
      </a>
    </section>
  );
}

export function ForumLink() {
  return (
    <Link to="/forum" className="rail__card rail__card--link">
      <MessagesSquare className="rail__icon" size={28} aria-hidden="true" />
      <span className="rail__title">{t("rail.forum")}</span>
      <span className="rail__lead">{t("rail.forumLead")}</span>
    </Link>
  );
}

export function SuggestionsLink() {
  return (
    <Link to="/suggestions" className="rail__card rail__card--link">
      <MessageSquarePlus className="rail__icon" size={28} aria-hidden="true" />
      <span className="rail__title">{t("rail.suggestions")}</span>
      <span className="rail__lead">{t("rail.suggestionsLead")}</span>
    </Link>
  );
}

/** Reserved space for future advertising. Intentionally empty; see the project plan. */
export function AdSlot() {
  return <aside className="rail__ad" aria-hidden="true" />;
}
