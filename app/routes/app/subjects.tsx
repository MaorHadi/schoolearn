import { Form, Link } from "react-router";
import type { Route } from "./+types/subjects";
import { t } from "~/i18n";
import { requireUser } from "~/server/auth/context.server";
import { enrollUser, listActiveSubjectsForUser } from "~/server/content/subjects.server";

export async function loader({ context }: Route.LoaderArgs) {
  const user = requireUser(context);
  return { subjects: await listActiveSubjectsForUser(user.id) };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = requireUser(context);
  const form = await request.formData();
  const subjectId = Number(form.get("subjectId"));
  if (Number.isInteger(subjectId) && subjectId > 0) await enrollUser(user.id, subjectId);
  return null;
}

export default function Subjects({ loaderData }: Route.ComponentProps) {
  return (
    <main className="container">
      <h1>{t("subjects.title")}</h1>
      <ul className="subject-list">
        {loaderData.subjects.map((subject) => (
          <li key={subject.id} className="card">
            <h2 dir={subject.direction}>{subject.name}</h2>
            {subject.description ? <p dir={subject.direction}>{subject.description}</p> : null}
            {subject.enrolled ? (
              <Link to={`/subjects/${subject.slug}`}>{t("subjects.open")}</Link>
            ) : (
              <Form method="post">
                <input type="hidden" name="subjectId" value={subject.id} />
                <button type="submit">{t("subjects.enroll")}</button>
              </Form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
