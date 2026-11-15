import { MessageSquarePlus } from "lucide-react";
import { Form, data } from "react-router";
import type { Route } from "./+types/suggestions";
import { EmptyState } from "~/components/EmptyState";
import { PageHeader } from "~/components/PageHeader";
import { t } from "~/i18n";
import { requireRole } from "~/server/auth/context.server";
import { flashFromContext } from "~/server/flash.server";
import { notFound } from "~/server/route-params.server";
import { SUGGESTION_STATUSES, SuggestionStatusUpdateSchema } from "~/schemas/feedback";
import { listSuggestions, updateSuggestionStatus } from "~/server/feedback/suggestions.server";
import { formatDateTime } from "~/shared/format-date";

export async function loader({ context }: Route.LoaderArgs) {
  requireRole(context, "SYSTEM_ADMIN");
  return { suggestions: await listSuggestions() };
}

export async function action({ request, context }: Route.ActionArgs) {
  requireRole(context, "SYSTEM_ADMIN");
  const form = Object.fromEntries(await request.formData());
  const parsed = SuggestionStatusUpdateSchema.safeParse(form);
  if (!parsed.success) throw data(t("error.generic"), { status: 400 });
  const updated = await updateSuggestionStatus(parsed.data.id, parsed.data.status);
  if (!updated) throw notFound();
  await flashFromContext(context, "success", "toast.statusUpdated");
  return null;
}

export default function SystemAdminSuggestions({ loaderData }: Route.ComponentProps) {
  const { suggestions } = loaderData;
  return (
    <main className="container page">
      <PageHeader
        title={t("systemAdmin.suggestions.title")}
        lead={t("systemAdmin.suggestions.lead")}
      />

      {suggestions.length === 0 ? (
        <EmptyState icon={MessageSquarePlus}>{t("systemAdmin.suggestions.empty")}</EmptyState>
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
                  <time dateTime={createdAt.toISOString()}>{formatDateTime(createdAt)}</time>
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
