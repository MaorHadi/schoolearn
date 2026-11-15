import { GraduationCap, Mail, MessageSquarePlus } from "lucide-react";
import { Link } from "react-router";
import { t } from "~/i18n";

/**
 * Side-rail pieces for the subjects page: a callout for teachers, a link to the suggestions
 * form, and reserved (empty) advertising slots.
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

export function SuggestionsLink() {
  return (
    <Link to="/suggestions" className="rail__card rail__card--link">
      <MessageSquarePlus className="rail__icon" size={28} aria-hidden="true" />
      <span className="rail__title">{t("rail.suggestions")}</span>
      <span className="rail__lead">{t("rail.suggestionsLead")}</span>
    </Link>
  );
}

/** Reserved space for future advertising. Intentionally empty. */
export function AdSlot() {
  return <aside className="rail__ad" aria-hidden="true" />;
}
