import { Search, Users } from "lucide-react";
import { Form, Link } from "react-router";
import type { Route } from "./+types/users";
import { UserStatusPill } from "~/components/admin/UserStatusPill";
import { EmptyState } from "~/components/EmptyState";
import { Field } from "~/components/forms/Field";
import { PageHeader } from "~/components/PageHeader";
import { t } from "~/i18n";
import { UserListQuerySchema, USER_SEARCH_MAX_LENGTH } from "~/schemas/user-admin";
import { requireRole } from "~/server/auth/context.server";
import { listUsers } from "~/server/users/user.server";
import { formatDate } from "~/shared/format-date";

export async function loader({ context, request }: Route.LoaderArgs) {
  requireRole(context, "SYSTEM_ADMIN");
  const url = new URL(request.url);
  const parsed = UserListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  const query = parsed.success ? parsed.data : { q: "", page: 1 };
  const page = await listUsers({ query: query.q, page: query.page });
  return { query: query.q, page };
}

function pageHref(query: string, page: number): string {
  const params = new URLSearchParams();
  if (query !== "") params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return `/system-admin/users${search === "" ? "" : `?${search}`}`;
}

export default function SystemAdminUsers({ loaderData }: Route.ComponentProps) {
  const { query, page } = loaderData;
  const lastPage = Math.max(1, Math.ceil(page.total / page.pageSize));

  return (
    <main className="container page">
      <PageHeader
        back={{ to: "/system-admin", label: t("systemAdmin.backToIndex") }}
        title={t("systemAdmin.users.title")}
        lead={t("systemAdmin.users.lead")}
      />

      <Form method="get" className="search-form" role="search">
        <Field label={t("systemAdmin.users.search")} hideLabel className="field search-form__field">
          <input
            className="field__input"
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t("systemAdmin.users.searchPlaceholder")}
            maxLength={USER_SEARCH_MAX_LENGTH}
            dir="ltr"
          />
        </Field>
        <button type="submit" className="btn btn--ghost">
          <Search size={18} aria-hidden="true" />
          {t("systemAdmin.users.search")}
        </button>
      </Form>

      {page.users.length === 0 ? (
        <EmptyState icon={Users}>
          {query === "" ? t("systemAdmin.users.empty") : t("systemAdmin.users.noMatch")}
        </EmptyState>
      ) : (
        <>
          <p className="muted">{t("systemAdmin.users.total", { count: page.total })}</p>
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t("auth.username")}</th>
                <th scope="col">{t("systemAdmin.users.email")}</th>
                <th scope="col">{t("systemAdmin.users.state")}</th>
                <th scope="col">{t("systemAdmin.users.createdAt")}</th>
              </tr>
            </thead>
            <tbody>
              {page.users.map((user) => {
                const createdAt = new Date(user.createdAt);
                return (
                  <tr key={user.id}>
                    <td>
                      <Link to={`/system-admin/users/${user.id}`} className="admin-table__primary">
                        <span className="ltr-value">{user.username}</span>
                      </Link>
                    </td>
                    <td className="admin-table__mono">
                      {user.email ? <span className="ltr-value">{user.email}</span> : "—"}
                    </td>
                    <td>
                      <UserStatusPill role={user.role} isDisabled={user.isDisabled} />
                    </td>
                    <td>
                      <time dateTime={createdAt.toISOString()}>{formatDate(createdAt)}</time>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lastPage > 1 ? (
            <nav className="pager" aria-label={t("systemAdmin.users.pager")}>
              {page.page > 1 ? (
                <Link to={pageHref(query, page.page - 1)} className="btn btn--ghost btn--small">
                  {t("systemAdmin.users.previous")}
                </Link>
              ) : null}
              <span className="muted">
                {t("systemAdmin.users.pageOf", { page: page.page, last: lastPage })}
              </span>
              {page.page < lastPage ? (
                <Link to={pageHref(query, page.page + 1)} className="btn btn--ghost btn--small">
                  {t("systemAdmin.users.next")}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </main>
  );
}
