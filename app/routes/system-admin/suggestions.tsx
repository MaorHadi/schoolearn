import { MessageSquarePlus } from "lucide-react";
import { Form, data } from "react-router";
import type { Route } from "./+types/suggestions";
import { t } from "~/i18n";
import { sessionContext } from "~/server/auth/context.server";
import { setFlash } from "~/server/flash.server";
import { SUGGESTION_STATUSES, SuggestionStatusUpdateSchema } from "~/schemas/feedback";
import { listSuggestions, updateSuggestionStatus } from "~/server/feedback/suggestions.server";

// Role is enforced by the system-admin layout loader.
// TODO(suggestions-triage): filter by status, paginate.
export async function loader() {
  return { suggestions: await listSuggestions() };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = Object.fromEntries(await request.formData());
  const parsed = SuggestionStatusUpdateSchema.safeParse(form);
  if (!parsed.success) throw data(t("error.generic"), { status: 400 });
  const updated = await updateSuggestionStatus(parsed.data.id, parsed.data.status);
  if (!updated) throw data(t("error.notFound"), { status: 404 });
  const session = context.get(sessionContext);
  if (session) await setFlash(session.id, "success", "toast.statusUpdated");
  return null;
}

// Fixed zone so server and client render the same text (no hydration mismatch).
const dateFormat = new Intl.DateTimeFormat("he-IL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jerusalem",
});

export default function SystemAdminSuggestions({ loaderData }: Route.ComponentProps) {
  const { suggestions } = loaderData;
  return (
    <main className="container page">
      <header className="page__head">
        <h1 className="page__title">{t("systemAdmin.suggestions.title")}</h1>
        <p className="page__lead">{t("systemAdmin.suggestions.lead")}</p>
      </header>

      {suggestions.length === 0 ? (
        <div className="empty empty--rich">
          <MessageSquarePlus size={28} aria-hidden="true" />
          <p>{t("systemAdmin.suggestions.empty")}</p>
        </div>
      ) : (
        <ul className="suggestion-list">
          {suggestions.map((suggestion) => {
            const createdAt = new Date(suggestion.createdAt);
            const selectId = `suggestion-status-${suggestion.id}`;
            return (
              <li key={suggestion.id} className="card suggestion">
                <div className="suggestion__meta">
                  <span className="suggestion__author">
                    {suggestion.username ?? t("systemAdmin.suggestions.deletedUser")}
                  </span>
                  <time dateTime={createdAt.toISOString()}>{dateFormat.format(createdAt)}</time>
                  <Form method="post" className="suggestion__form">
                    <input type="hidden" name="id" value={suggestion.id} />
                    <label htmlFor={selectId} className="muted">
                      {t("systemAdmin.suggestions.statusLabel")}
                    </label>
                    <select
                      id={selectId}
                      name="status"
                      className="suggestion__select"
                      defaultValue={suggestion.status}
                    >
                      {SUGGESTION_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {t(`systemAdmin.suggestions.status.${status}`)}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn--ghost btn--small">
                      {t("systemAdmin.suggestions.save")}
                    </button>
                  </Form>
                </div>
                <p className="suggestion__body">{suggestion.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
