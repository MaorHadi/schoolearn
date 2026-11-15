import { data } from "react-router";
import type { Route } from "./+types/subjects";
import { SubjectCard } from "~/components/SubjectCard";
import { AdSlot, SuggestionsLink, TeacherCallout } from "~/components/SubjectsRails";
import { t } from "~/i18n";
import { requireUser, sessionContext } from "~/server/auth/context.server";
import { enrollUser, listActiveSubjectsForUser } from "~/server/content/subjects.server";
import { setFlash } from "~/server/flash.server";
import { getSystemSettings } from "~/server/settings/settings.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = requireUser(context);
  const welcome = new URL(request.url).searchParams.has("welcome");
  const [subjects, settings] = await Promise.all([
    listActiveSubjectsForUser(user.id),
    getSystemSettings(),
  ]);
  return { subjects, welcome, contactEmail: settings.contactEmail };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = requireUser(context);
  const form = await request.formData();
  const subjectId = Number(form.get("subjectId"));
  const enrolled =
    Number.isInteger(subjectId) && subjectId > 0 ? await enrollUser(user.id, subjectId) : null;
  if (!enrolled) throw data(t("error.notFound"), { status: 404 });
  const session = context.get(sessionContext);
  if (session) await setFlash(session.id, "success", "toast.enrolled", { subject: enrolled.name });
  return null;
}

export default function Subjects({ loaderData }: Route.ComponentProps) {
  const { subjects, welcome, contactEmail } = loaderData;
  const enrolledCount = subjects.filter((subject) => subject.enrolled).length;

  return (
    <div className="container page subjects-shell">
      {/* The header spans the whole shell, so the rails start level with the subject cards. */}
      <header className="page__head subjects-head">
        {welcome ? (
          <p className="banner" role="status">
            {t("subjects.welcome")}
          </p>
        ) : null}
        <h1 className="page__title">{t("subjects.title")}</h1>
        <p className="page__lead">
          {enrolledCount === 0 ? t("subjects.leadNew") : t("subjects.leadReturning")}
        </p>
      </header>

      <aside className="rail rail--start">
        <SuggestionsLink />
        <AdSlot />
      </aside>

      <main className="subjects-main">
        {subjects.length === 0 ? (
          <p className="empty">{t("subjects.empty")}</p>
        ) : (
          <div className="subject-grid">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        )}
      </main>

      <aside className="rail rail--end">
        <TeacherCallout email={contactEmail} />
        <AdSlot />
      </aside>
    </div>
  );
}
