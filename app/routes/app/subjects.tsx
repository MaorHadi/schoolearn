import { data } from "react-router";
import type { Route } from "./+types/subjects";
import { SubjectCard } from "~/components/SubjectCard";
import { t } from "~/i18n";
import { requireUser } from "~/server/auth/context.server";
import { enrollUser, listActiveSubjectsForUser } from "~/server/content/subjects.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = requireUser(context);
  const welcome = new URL(request.url).searchParams.has("welcome");
  return { subjects: await listActiveSubjectsForUser(user.id), welcome };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = requireUser(context);
  const form = await request.formData();
  const subjectId = Number(form.get("subjectId"));
  const enrolled =
    Number.isInteger(subjectId) && subjectId > 0 && (await enrollUser(user.id, subjectId));
  if (!enrolled) throw data(t("error.notFound"), { status: 404 });
  return null;
}

export default function Subjects({ loaderData }: Route.ComponentProps) {
  const { subjects, welcome } = loaderData;
  const enrolledCount = subjects.filter((subject) => subject.enrolled).length;

  return (
    <main className="container page">
      {welcome ? (
        <p className="banner" role="status">
          {t("subjects.welcome")}
        </p>
      ) : null}

      <header className="page__head">
        <h1 className="page__title">{t("subjects.title")}</h1>
        <p className="page__lead">
          {enrolledCount === 0 ? t("subjects.leadNew") : t("subjects.leadReturning")}
        </p>
      </header>

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
  );
}
