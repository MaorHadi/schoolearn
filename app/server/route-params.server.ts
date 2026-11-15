import { data } from "react-router";
import { t } from "~/i18n";

/** The 404 every loader and action throws for a row that does not exist (or is not visible). */
export function notFound() {
  return data(t("error.notFound"), { status: 404 });
}

/** A numeric id from the URL (`:lessonId`, `:subjectId`, ...). Anything else is a 404. */
export function parseIdParam(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw notFound();
  return id;
}
