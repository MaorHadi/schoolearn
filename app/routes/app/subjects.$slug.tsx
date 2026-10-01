import { Link, data } from "react-router";
import type { Route } from "./+types/subjects.$slug";
import { t } from "~/i18n";
import { requireUser } from "~/server/auth/context.server";
import { getSubjectBySlugForUser } from "~/server/content/subjects.server";
import { getSubjectTree } from "~/server/progress/unlock.server";

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = requireUser(context);
  const subject = await getSubjectBySlugForUser(user.id, params.slug);
  if (!subject) throw data(t("error.notFound"), { status: 404 });
  const tree = await getSubjectTree(user.id, subject.id);
  return {
    subject: { slug: subject.slug, name: subject.name, direction: subject.direction },
    tree,
  };
}

export default function SubjectPage({ loaderData }: Route.ComponentProps) {
  const { subject, tree } = loaderData;
  return (
    <main className="container">
      <h1 dir={subject.direction}>{subject.name}</h1>
      {tree.map((section) => (
        <section key={section.id} className={section.unlocked ? "card" : "card locked"}>
          <h2 dir={subject.direction}>
            {section.title}
            {section.unlocked ? "" : ` (${t("subject.locked")})`}
          </h2>
          <ol>
            {section.lessons.map((lesson) => (
              <li key={lesson.id}>
                {lesson.unlocked ? (
                  <Link
                    to={`/subjects/${subject.slug}/lessons/${lesson.id}`}
                    dir={subject.direction}
                  >
                    {lesson.title}
                  </Link>
                ) : (
                  <span dir={subject.direction} className="locked">
                    {lesson.title}
                  </span>
                )}
                {lesson.completed ? ` · ${t("subject.completed")}` : ""}
                {lesson.bestScore != null
                  ? ` · ${t("subject.bestScore")}: ${lesson.bestScore}`
                  : ""}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
